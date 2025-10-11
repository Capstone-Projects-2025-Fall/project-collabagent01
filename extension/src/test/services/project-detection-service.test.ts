import { 
    getCurrentProjectInfo, 
    isSameProject, 
    validateCurrentProject,
    ProjectInfo 
} from '../../services/project-detection-service';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock VS Code API
jest.mock('vscode', () => ({
    workspace: {
        workspaceFolders: []
    },
    Uri: {
        fsPath: ''
    }
}));

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Project Detection Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCurrentProjectInfo', () => {
        it('should return null when no workspace folders are open', () => {
            (vscode.workspace as any).workspaceFolders = undefined;
            
            const result = getCurrentProjectInfo();
            
            expect(result).toBeNull();
        });

        it('should return project info for a simple folder without Git', () => {
            const testPath = '/Users/test/my-project';
            (vscode.workspace as any).workspaceFolders = [{
                uri: { fsPath: testPath }
            }];
            
            // Mock fs.existsSync to return false for .git directory
            mockedFs.existsSync.mockReturnValue(false);
            
            const result = getCurrentProjectInfo();
            
            expect(result).toEqual({
                localPath: testPath,
                remoteUrl: undefined,
                projectHash: expect.any(String),
                projectName: 'my-project',
                isGitRepo: false
            });
        });

        it('should detect Git repository and extract remote URL', () => {
            const testPath = '/Users/test/git-project';
            const gitConfigContent = `[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
        ignorecase = true
        precomposeunicode = true
[remote "origin"]
        url = https://github.com/user/repo.git
        fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
        remote = origin
        merge = refs/heads/main`;

            (vscode.workspace as any).workspaceFolders = [{
                uri: { fsPath: testPath }
            }];
            
            // Mock Git directory exists
            mockedFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
                if (filePath.toString().includes('.git')) {
                    return true;
                }
                return false;
            });

            // Mock Git config file read
            mockedFs.readFileSync.mockReturnValue(gitConfigContent);
            mockedFs.statSync.mockReturnValue({ isFile: () => false } as any);
            
            const result = getCurrentProjectInfo();
            
            expect(result?.isGitRepo).toBe(true);
            expect(result?.remoteUrl).toBe('https://github.com/user/repo');
            expect(result?.projectName).toBe('git-project');
        });

        it('should normalize SSH Git URLs to HTTPS', () => {
            const testPath = '/Users/test/ssh-project';
            const gitConfigContent = `[remote "origin"]
        url = git@github.com:user/repo.git`;

            (vscode.workspace as any).workspaceFolders = [{
                uri: { fsPath: testPath }
            }];
            
            mockedFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
                return filePath.toString().includes('.git');
            });
            mockedFs.readFileSync.mockReturnValue(gitConfigContent);
            mockedFs.statSync.mockReturnValue({ isFile: () => false } as any);
            
            const result = getCurrentProjectInfo();
            
            expect(result?.remoteUrl).toBe('https://github.com/user/repo');
        });
    });

    describe('isSameProject', () => {
        it('should return true for identical hashes', () => {
            const hash1 = 'abc123def456';
            const hash2 = 'abc123def456';
            
            expect(isSameProject(hash1, hash2)).toBe(true);
        });

        it('should return false for different hashes', () => {
            const hash1 = 'abc123def456';
            const hash2 = 'xyz789uvw012';
            
            expect(isSameProject(hash1, hash2)).toBe(false);
        });

        it('should be case insensitive', () => {
            const hash1 = 'ABC123def456';
            const hash2 = 'abc123DEF456';
            
            expect(isSameProject(hash1, hash2)).toBe(true);
        });
    });

    describe('validateCurrentProject', () => {
        it('should return match when project hashes are identical', () => {
            const testPath = '/Users/test/project';
            const expectedHash = 'abc123def456';
            
            (vscode.workspace as any).workspaceFolders = [{
                uri: { fsPath: testPath }
            }];
            
            mockedFs.existsSync.mockReturnValue(false);
            
            // Mock the hash generation to return expected hash
            jest.spyOn(require('crypto'), 'createHash').mockReturnValue({
                update: jest.fn().mockReturnThis(),
                digest: jest.fn().mockReturnValue(expectedHash + 'extra')
            });
            
            const result = validateCurrentProject(expectedHash);
            
            expect(result.isMatch).toBe(true);
            expect(result.currentProject).toBeDefined();
        });

        it('should return no match when no workspace is open', () => {
            (vscode.workspace as any).workspaceFolders = undefined;
            
            const result = validateCurrentProject('someHash');
            
            expect(result.isMatch).toBe(false);
            expect(result.currentProject).toBeNull();
            expect(result.reason).toBe('No workspace folder is currently open');
        });

        it('should match by remote URL when hashes differ', () => {
            const testPath = '/Users/test/project';
            const expectedRemoteUrl = 'https://github.com/user/repo';
            const gitConfigContent = `[remote "origin"]
        url = ${expectedRemoteUrl}.git`;
            
            (vscode.workspace as any).workspaceFolders = [{
                uri: { fsPath: testPath }
            }];
            
            mockedFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
                return filePath.toString().includes('.git');
            });
            mockedFs.readFileSync.mockReturnValue(gitConfigContent);
            mockedFs.statSync.mockReturnValue({ isFile: () => false } as any);
            
            const result = validateCurrentProject('differentHash', expectedRemoteUrl);
            
            expect(result.isMatch).toBe(true);
            expect(result.currentProject?.remoteUrl).toBe(expectedRemoteUrl);
        });
    });
});