import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ProjectInfo {
    
    localPath: string;
    
    remoteUrl?: string;
    
    
    //A unique hash identifying this project
    //This is generated from Git config or folder structure
    projectHash: string;
    
    //The name of the project (derived from folder name or repo name)
    projectName: string;
    
    isGitRepo: boolean;
}

//Detects the current project information from the active VS Code workspace
export function getCurrentProjectInfo(): ProjectInfo | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return null;
    }

    // Use the first workspace folder as the primary project
    const primaryFolder = workspaceFolders[0];
    const localPath = primaryFolder.uri.fsPath;
    const projectName = path.basename(localPath);

    // Try to get Git information
    const gitInfo = getGitInfo(localPath);
    
    // Generate a unique project identifier
    const projectHash = generateProjectHash(localPath, gitInfo?.remoteUrl);

    return {
        localPath,
        remoteUrl: gitInfo?.remoteUrl,
        projectHash,
        projectName,
        isGitRepo: gitInfo?.isGitRepo || false
    };
}


//Extracts Git repository information from a local folder
function getGitInfo(folderPath: string): { remoteUrl?: string; isGitRepo: boolean } | null {
    try {
        const gitConfigPath = path.join(folderPath, '.git', 'config');
        
        // Check if .git directory exists
        if (!fs.existsSync(path.join(folderPath, '.git'))) {
            return { isGitRepo: false };
        }

        // If it's a Git worktree, read the .git file
        const gitPath = path.join(folderPath, '.git');
        let actualGitConfigPath = gitConfigPath;
        
        if (fs.statSync(gitPath).isFile()) {
            const gitFileContent = fs.readFileSync(gitPath, 'utf8');
            const match = gitFileContent.match(/gitdir: (.+)/);
            if (match) {
                const gitDir = match[1].trim();
                actualGitConfigPath = path.join(path.resolve(folderPath, gitDir), 'config');
            }
        }

        // Read Git config to find remote URL
        if (!fs.existsSync(actualGitConfigPath)) {
            return { isGitRepo: true };
        }

        const configContent = fs.readFileSync(actualGitConfigPath, 'utf8');
        
        // Look for the origin remote URL
        const remoteMatch = configContent.match(/\[remote "origin"\]\s*\n(?:[^\[]*\n)*?\s*url = (.+)/m);
        const remoteUrl = remoteMatch ? normalizeGitUrl(remoteMatch[1].trim()) : undefined;

        return {
            remoteUrl,
            isGitRepo: true
        };
    } catch (error) {
        console.warn('Error reading Git info:', error);
        return { isGitRepo: false };
    }
}

//Normalizes Git URLs to a standard format for comparison

function normalizeGitUrl(url: string): string {
    // Remove .git suffix if present
    let normalized = url.replace(/\.git$/, '');
    
    // Convert SSH to HTTPS format for consistency
    if (normalized.startsWith('git@')) {
        // Convert git@github.com:user/repo to https://github.com/user/repo
        normalized = normalized.replace(/^git@([^:]+):/, 'https://$1/');
    }
    
    // Ensure it starts with https://
    if (!normalized.startsWith('https://')) {
        // Handle other protocols by converting to https
        normalized = normalized.replace(/^[^:]+:\/\//, 'https://');
    }
    
    return normalized.toLowerCase();
}


//Generates a unique hash for the project based on available information
 
function generateProjectHash(localPath: string, remoteUrl?: string): string {
    const hash = crypto.createHash('sha256');
    
    if (remoteUrl) {
        // If we have a remote URL, use that as the primary identifier
        hash.update(normalizeGitUrl(remoteUrl));
    } else {
        // Fallback: use the project structure hash
        const structureHash = generateProjectStructureHash(localPath);
        hash.update(structureHash);
    }
    
    return hash.digest('hex').substring(0, 16); // First 16 characters for readability
}

/**
 * Generates a hash based on the project's file structure
 * This is used as a fallback when Git info is not available
 */
function generateProjectStructureHash(folderPath: string): string {
    try {
        const importantFiles = [
            'package.json',
            'composer.json',
            'pom.xml',
            'build.gradle',
            'requirements.txt',
            'Cargo.toml',
            'go.mod',
            '.gitignore'
        ];
        
        const existingFiles: string[] = [];
        const fileContents: string[] = [];
        
        for (const file of importantFiles) {
            const filePath = path.join(folderPath, file);
            if (fs.existsSync(filePath)) {
                existingFiles.push(file);
                try {
                    // Read first 1KB of each important file for fingerprinting
                    const content = fs.readFileSync(filePath, 'utf8').substring(0, 1024);
                    fileContents.push(content);
                } catch (error) {
                    // If we can't read the file, just include its name
                    console.warn(`Could not read ${file}:`, error);
                }
            }
        }
        
        // Create hash from folder name + existing files + partial contents
        const projectName = path.basename(folderPath);
        const combinedData = projectName + existingFiles.join(',') + fileContents.join('|');
        
        return crypto.createHash('sha256').update(combinedData).digest('hex');
    } catch (error) {
        console.warn('Error generating structure hash:', error);
        // Ultimate fallback: just use the folder name
        return crypto.createHash('sha256').update(path.basename(folderPath)).digest('hex');
    }
}


//Compares two project hashes to determine if they represent the same project
 
export function isSameProject(hash1: string, hash2: string): boolean {
    return hash1.toLowerCase() === hash2.toLowerCase();
}


//Validates if the current workspace matches the expected project

export function validateCurrentProject(expectedProjectHash: string, expectedRemoteUrl?: string): {
    isMatch: boolean;
    currentProject: ProjectInfo | null;
    reason?: string;
} {
    const currentProject = getCurrentProjectInfo();
    
    if (!currentProject) {
        return {
            isMatch: false,
            currentProject: null,
            reason: 'No workspace folder is currently open'
        };
    }

    // Enforce Git requirement for team projects
    if (!currentProject.isGitRepo || !currentProject.remoteUrl) {
        return {
            isMatch: false,
            currentProject,
            reason: 'Team functionality requires a Git repository with remote origin. Please clone the team\'s repository.'
        };
    }
    
    // Primary check: compare project hashes
    if (isSameProject(currentProject.projectHash, expectedProjectHash)) {
        return {
            isMatch: true,
            currentProject
        };
    }
    
    // Secondary check: if both have remote URLs, compare those
    if (currentProject.remoteUrl && expectedRemoteUrl) {
        const currentNormalized = normalizeGitUrl(currentProject.remoteUrl);
        const expectedNormalized = normalizeGitUrl(expectedRemoteUrl);
        
        if (currentNormalized === expectedNormalized) {
            return {
                isMatch: true,
                currentProject
            };
        }
    }
    
    return {
        isMatch: false,
        currentProject,
        reason: expectedRemoteUrl 
            ? `Current project (${currentProject.remoteUrl || 'local'}) doesn't match team project (${expectedRemoteUrl})`
            : `Project fingerprint doesn't match team project`
    };
}


//Gets a user-friendly description of the current project

export function getProjectDescription(project: ProjectInfo): string {
    if (project.remoteUrl) {
        return `${project.projectName} (${project.remoteUrl})`;
    }
    return `${project.projectName} (local folder: ${project.localPath})`;
}