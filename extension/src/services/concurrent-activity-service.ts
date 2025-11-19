/**
 * Service to detect and notify when multiple users are actively making changes concurrently.
 * Monitors file snapshots and team activity to identify when 2+ users are working simultaneously.
 */

import { getSupabase } from '../auth/supabaseClient';
import { getCurrentUserId } from './auth-service';
import * as vscode from 'vscode';

interface UserActivity {
  userId: string;
  displayName: string;
  lastActivityTime: Date;
  changeCount: number;
}

interface SnapshotRecord {
  user_id: string;
  created_at: string;
  changes: Record<string, string>;
}

export class ConcurrentActivityDetector {
  private supabase = getSupabase();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
  private readonly ACTIVITY_WINDOW_MS = 300000; // 5 minute window for "active"
  private readonly MIN_CHANGES_THRESHOLD = 2; // Minimum 2 changes
  private readonly MAX_CHANGES_THRESHOLD = 5; // Maximum 5 changes for notification
  private notifiedPairs = new Set<string>(); // Track who we've already notified about
  private lastCheckTime = new Date();

  /**
   * Starts monitoring for concurrent user activity
   */
  public startMonitoring(teamId: string) {
    console.log('[ConcurrentActivity] Starting concurrent activity monitoring for team:', teamId);

    // Clear any existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check immediately
    this.checkForConcurrentActivity(teamId);

    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkForConcurrentActivity(teamId);
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stops monitoring for concurrent user activity
   */
  public stopMonitoring() {
    console.log('[ConcurrentActivity] Stopping concurrent activity monitoring');
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.notifiedPairs.clear();
  }

  /**
   * Main logic to detect concurrent activity and send notifications
   */
  private async checkForConcurrentActivity(teamId: string) {
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.log('[ConcurrentActivity] No current user, skipping check');
        return;
      }

      // Get recent snapshots within the activity window
      const windowStart = new Date(Date.now() - this.ACTIVITY_WINDOW_MS);
      
      const { data: snapshots, error } = await this.supabase
        .from('file_snapshots')
        .select(`
          user_id,
          created_at,
          changes
        `)
        .eq('team_id', teamId)
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ConcurrentActivity] Error fetching snapshots:', error);
        return;
      }

      if (!snapshots || snapshots.length === 0) {
        return;
      }

      // Aggregate activity by user
      const userActivityMap = new Map<string, UserActivity>();

      for (const snapshot of snapshots as SnapshotRecord[]) {
        const userId = snapshot.user_id;
        
        // Count the number of file changes in this snapshot
        const changeCount = snapshot.changes ? Object.keys(snapshot.changes).length : 0;
        
        if (changeCount === 0) {
          continue; // Skip snapshots with no changes
        }

        const activityTime = new Date(snapshot.created_at);

        if (!userActivityMap.has(userId)) {
          // Get user display name
          const displayName = await this.getUserDisplayName(userId);
          
          userActivityMap.set(userId, {
            userId,
            displayName,
            lastActivityTime: activityTime,
            changeCount: changeCount
          });
        } else {
          // Update existing entry with latest activity
          const existing = userActivityMap.get(userId)!;
          existing.changeCount += changeCount;
          if (activityTime > existing.lastActivityTime) {
            existing.lastActivityTime = activityTime;
          }
        }
      }

      // Filter out the current user and check for concurrent activity
      const otherUsers = Array.from(userActivityMap.values())
        .filter(u => u.userId !== currentUserId);

      // Check if there are other active users with changes in the threshold range
      const activeUsers = otherUsers.filter(u => 
        u.changeCount >= this.MIN_CHANGES_THRESHOLD && 
        u.changeCount <= this.MAX_CHANGES_THRESHOLD
      );

      if (activeUsers.length > 0) {
        await this.sendConcurrentActivityNotification(teamId, currentUserId, activeUsers);
      }

      // Update last check time
      this.lastCheckTime = new Date();

    } catch (error) {
      console.error('[ConcurrentActivity] Error checking concurrent activity:', error);
    }
  }

  /**
   * Sends a notification about concurrent activity to the team timeline
   */
  private async sendConcurrentActivityNotification(
    teamId: string,
    currentUserId: string,
    activeUsers: UserActivity[]
  ) {
    try {
      const currentUserName = await this.getUserDisplayName(currentUserId);
      
      // Check each active user to see if we should notify
      for (const user of activeUsers) {
        const pairKey = [currentUserId, user.userId].sort().join(':');
        
        // Skip if we've already notified about this pair recently
        if (this.notifiedPairs.has(pairKey)) {
          continue;
        }

        // Create notification message
        const summary = `${currentUserName} and ${user.displayName} are both actively working on the project (${user.changeCount} recent changes detected). Consider reaching out and starting a Live Share session to collaborate!`;
        const eventHeader = `👥 Concurrent Activity Detected`;

        // Insert into team activity feed
        const { error } = await this.supabase
          .from('team_activity_feed')
          .insert({
            team_id: teamId,
            user_id: currentUserId,
            event_header: eventHeader,
            summary: summary,
            activity_type: 'concurrent_activity',
            file_path: null,
            source_snapshot_id: null
          });

        if (error) {
          console.error('[ConcurrentActivity] Error inserting notification:', error);
        } else {
          console.log(`[ConcurrentActivity] Notification sent: ${currentUserName} and ${user.displayName} working concurrently`);
          
          // Show VS Code notification
          const action = await vscode.window.showInformationMessage(
            `${user.displayName} is also working on this project. Start a Live Share session?`,
            'Start Live Share',
            'Dismiss'
          );

          if (action === 'Start Live Share') {
            vscode.commands.executeCommand('liveshare.start');
          }

          // Mark this pair as notified (expires after 1 hour)
          this.notifiedPairs.add(pairKey);
          setTimeout(() => {
            this.notifiedPairs.delete(pairKey);
          }, 3600000); // 1 hour
        }
      }
    } catch (error) {
      console.error('[ConcurrentActivity] Error sending notification:', error);
    }
  }

  /**
   * Gets the display name for a user
   */
  private async getUserDisplayName(userId: string): Promise<string> {
    try {
      // First try to get from user_profiles
      const { data: profile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select('name')
        .eq('id', userId)
        .single();

      if (!profileError && profile?.name) {
        return profile.name;
      }

      // Fallback to email from auth.users
      const { data: { user }, error: userError } = await this.supabase.auth.admin.getUserById(userId);
      
      if (!userError && user?.email) {
        return user.email.split('@')[0]; // Use email prefix
      }

      return 'Unknown User';
    } catch (error) {
      console.error('[ConcurrentActivity] Error getting display name:', error);
      return 'Unknown User';
    }
  }

  /**
   * Manually trigger a check for concurrent activity (for testing or on-demand checks)
   */
  public async triggerCheck(teamId: string) {
    await this.checkForConcurrentActivity(teamId);
  }
}

// Singleton instance
let detectorInstance: ConcurrentActivityDetector | null = null;

/**
 * Gets or creates the singleton concurrent activity detector instance
 */
export function getConcurrentActivityDetector(): ConcurrentActivityDetector {
  if (!detectorInstance) {
    detectorInstance = new ConcurrentActivityDetector();
  }
  return detectorInstance;
}

/**
 * Starts monitoring for concurrent activity on a team
 */
export function startConcurrentActivityMonitoring(teamId: string) {
  const detector = getConcurrentActivityDetector();
  detector.startMonitoring(teamId);
}

/**
 * Stops monitoring for concurrent activity
 */
export function stopConcurrentActivityMonitoring() {
  const detector = getConcurrentActivityDetector();
  detector.stopMonitoring();
}
