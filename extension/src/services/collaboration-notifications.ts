import * as vscode from 'vscode';
import { getPresenceService, OnlineTeamMember, PresenceChangeEvent } from './presence-service';

/**
 * CollaborationNotificationManager handles smart notifications
 * to encourage real-time collaboration when teammates come online
 */
export class CollaborationNotificationManager {
    private disposables: vscode.Disposable[] = [];
    private notificationCooldowns: Map<string, number> = new Map();
    private readonly COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown per user

    constructor(private context: vscode.ExtensionContext) {}

    /**
     * Start listening for presence changes and showing notifications
     */
    async start(teamId: string): Promise<void> {
        const presenceService = getPresenceService(this.context);

        // Register presence change listener
        const disposable = presenceService.onPresenceChange(async (event) => {
            if (event.type === 'member_online') {
                await this.handleMemberCameOnline(event);
            }
        });

        this.disposables.push(disposable);
        console.log('Collaboration notification manager started');
    }

    /**
     * Handle when a team member comes online
     */
    private async handleMemberCameOnline(event: PresenceChangeEvent): Promise<void> {
        const { member, teamId } = event;

        // Check cooldown to avoid spam
        if (this.isInCooldown(member.user_id)) {
            console.log(`Notification cooldown active for user ${member.github_username}`);
            return;
        }

        // Check if we recently showed this notification in the database
        const presenceService = getPresenceService(this.context);
        const recentlyShown = await presenceService.wasNotificationShownRecently(
            teamId,
            member.user_id,
            'came_online'
        );

        if (recentlyShown) {
            console.log(`Notification recently shown for ${member.github_username}`);
            return;
        }

        // Show the notification
        await this.showCollaborationNotification(member, teamId);

        // Set cooldown
        this.setCooldown(member.user_id);

        // Record notification in database
        await presenceService.recordNotificationShown(
            teamId,
            member.user_id,
            'came_online'
        );
    }

    /**
     * Show a friendly notification encouraging collaboration
     */
    private async showCollaborationNotification(
        member: OnlineTeamMember,
        teamId: string
    ): Promise<void> {
        const username = member.github_username || 'A teammate';

        // Create a friendly message
        const messages = [
            `Hey! ${username} is now online. Want to start a Live Share session?`,
            `${username} just came online. Time to collaborate?`,
            `Looks like ${username} is active! Start a Live Share session together?`,
            `${username} is online and ready to code! Invite them to Live Share?`
        ];

        const message = messages[Math.floor(Math.random() * messages.length)];

        // Show notification with action buttons
        const action = await vscode.window.showInformationMessage(
            message,
            { modal: false },
            'Start Live Share',
            'Dismiss'
        );

        if (action === 'Start Live Share') {
            await this.startLiveShareSession();
        }
    }

    /**
     * Start a Live Share session
     */
    private async startLiveShareSession(): Promise<void> {
        try {
            // Execute the existing Live Share start command
            await vscode.commands.executeCommand('collabAgent.startLiveShare');
        } catch (error) {
            console.error('Failed to start Live Share:', error);
            vscode.window.showErrorMessage('Failed to start Live Share session');
        }
    }

    /**
     * Check if user is in notification cooldown
     */
    private isInCooldown(userId: string): boolean {
        const cooldownEnd = this.notificationCooldowns.get(userId);
        if (!cooldownEnd) {
            return false;
        }

        if (Date.now() > cooldownEnd) {
            this.notificationCooldowns.delete(userId);
            return false;
        }

        return true;
    }

    /**
     * Set notification cooldown for a user
     */
    private setCooldown(userId: string): void {
        this.notificationCooldowns.set(userId, Date.now() + this.COOLDOWN_MS);
    }

    /**
     * Manually show a notification to invite a specific user
     */
    async inviteUserToCollaborate(member: OnlineTeamMember, teamId: string): Promise<void> {
        await this.showCollaborationNotification(member, teamId);
    }

    /**
     * Stop the notification manager
     */
    stop(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.notificationCooldowns.clear();
    }

    /**
     * Dispose of the manager
     */
    dispose(): void {
        this.stop();
    }
}

// Singleton instance
let notificationManagerInstance: CollaborationNotificationManager | null = null;

/**
 * Get or create the CollaborationNotificationManager singleton
 */
export function getCollaborationNotificationManager(
    context: vscode.ExtensionContext
): CollaborationNotificationManager {
    if (!notificationManagerInstance) {
        notificationManagerInstance = new CollaborationNotificationManager(context);
    }
    return notificationManagerInstance;
}

/**
 * Initialize collaboration notifications for a team
 */
export async function initializeCollaborationNotifications(
    context: vscode.ExtensionContext,
    teamId: string
): Promise<void> {
    const manager = getCollaborationNotificationManager(context);
    await manager.start(teamId);
}

/**
 * Stop collaboration notifications
 */
export function stopCollaborationNotifications(): void {
    if (notificationManagerInstance) {
        notificationManagerInstance.stop();
    }
}
