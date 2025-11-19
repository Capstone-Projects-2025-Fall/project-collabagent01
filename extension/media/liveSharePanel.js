(function () {
	// Use global vscode if already initialized (when embedded in mainPanel)
	const vscode = window.vscode || acquireVsCodeApi();

	let isEndingSession = false;
	let endingSessionTimer = null;
	window.__collabAgentLastLink = '';

	function post(command, payload = {}) {
		vscode.postMessage({ command, ...payload });
	}

	window.startLiveShare = () => post('startLiveShare');
	window.joinLiveShare = () => post('joinLiveShare');

	// Home tab: Install Live Share and Login buttons
	function setupHomePanelButtons() {
		const installBtn = document.getElementById('installLiveShareBtn');
		if (installBtn) {
			installBtn.addEventListener('click', function() {
				post('installLiveShare');
			});
		}
		const loginBtn = document.getElementById('loginBtn');
		if (loginBtn) {
			loginBtn.addEventListener('click', function() {
				post('loginOrSignup');
			});
		}
	}
	// Agent tab: Team management buttons
	function setupAgentPanelButtons() {
		console.log('Setting up Agent Panel buttons');
		
		const createTeamBtn = document.getElementById('createTeamBtn');
		if (createTeamBtn && !createTeamBtn.hasAttribute('data-listener-added')) {
			createTeamBtn.addEventListener('click', function() {
				console.log('Create Team button clicked');
				post('createTeam');
			});
			createTeamBtn.setAttribute('data-listener-added', 'true');
			console.log('Create Team button listener added');
		} else if (!createTeamBtn) {
			console.log('Create Team button not found');
		}
		
		const joinTeamBtn = document.getElementById('joinTeamBtn');
		if (joinTeamBtn && !joinTeamBtn.hasAttribute('data-listener-added')) {
			joinTeamBtn.addEventListener('click', function() {
				console.log('Join Team button clicked');
				post('joinTeam');
			});
			joinTeamBtn.setAttribute('data-listener-added', 'true');
			console.log('Join Team button listener added');
		} else if (!joinTeamBtn) {
			console.log('Join Team button not found');
		}
		
		const switchTeamBtn = document.getElementById('switchTeamBtn');
		if (switchTeamBtn && !switchTeamBtn.hasAttribute('data-listener-added')) {
			switchTeamBtn.addEventListener('click', function() {
				console.log('Switch Team button clicked');
				post('switchTeam');
			});
			switchTeamBtn.setAttribute('data-listener-added', 'true');
			console.log('Switch Team button listener added');
		} else if (!switchTeamBtn) {
			console.log('Switch Team button not found');
		}
		
		const refreshTeamsBtn = document.getElementById('refreshTeamsBtn');
		if (refreshTeamsBtn && !refreshTeamsBtn.hasAttribute('data-listener-added')) {
			refreshTeamsBtn.addEventListener('click', function() {
				console.log('Refresh Teams button clicked');
				post('refreshTeams');
			});
			refreshTeamsBtn.setAttribute('data-listener-added', 'true');
			console.log('Refresh Teams button listener added');
		} else if (!refreshTeamsBtn) {
			console.log('Refresh Teams button not found');
		}
		
		const copyJoinCodeBtn = document.getElementById('copyJoinCodeBtn');
		if (copyJoinCodeBtn && !copyJoinCodeBtn.hasAttribute('data-listener-added')) {
			copyJoinCodeBtn.addEventListener('click', copyJoinCode);
			copyJoinCodeBtn.setAttribute('data-listener-added', 'true');
			console.log('Copy Join Code button listener added');
		} else if (!copyJoinCodeBtn) {
			console.log('Copy Join Code button not found');
		}

		const deleteTeamBtn = document.getElementById('deleteTeamBtn');
		if (deleteTeamBtn && !deleteTeamBtn.hasAttribute('data-listener-added')) {
			deleteTeamBtn.addEventListener('click', function() {
				console.log('Delete Team button clicked');
				post('deleteTeam');
			});
			deleteTeamBtn.setAttribute('data-listener-added', 'true');
			console.log('Delete Team button listener added');
		}

		const leaveTeamBtn = document.getElementById('leaveTeamBtn');
		if (leaveTeamBtn && !leaveTeamBtn.hasAttribute('data-listener-added')) {
			leaveTeamBtn.addEventListener('click', function() {
				console.log('Leave Team button clicked');
				post('leaveTeam');
			});
			leaveTeamBtn.setAttribute('data-listener-added', 'true');
			console.log('Leave Team button listener added');
		}
	}
	
	function copyJoinCode() {
		const joinCodeElement = document.getElementById('teamJoinCode');
		if (joinCodeElement && joinCodeElement.textContent !== '—') {
			navigator.clipboard.writeText(joinCodeElement.textContent).then(() => {
				const btn = document.getElementById('copyJoinCodeBtn');
				if (btn) {
					const originalText = btn.textContent;
					btn.textContent = '✓';
					setTimeout(() => {
						btn.textContent = originalText;
					}, 1000);
				}
			}).catch(() => {
				const textArea = document.createElement('textarea');
				textArea.value = joinCodeElement.textContent;
				document.body.appendChild(textArea);
				textArea.select();
				document.execCommand('copy');
				document.body.removeChild(textArea);
			});
		}
	}

	function setupAllButtons() {
		setupHomePanelButtons();
		setupAgentPanelButtons();
		setupSnapshotForm();
		setupActivityFeed();
		setupProfilePanel();
	}

	// Run on DOMContentLoaded or immediately if loaded
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', setupAllButtons);
	} else {
		setupAllButtons();
	}
	
	// Additional fallback: try again after a short delay
	setTimeout(() => {
		console.log('Fallback initialization after 100ms');
		setupAllButtons();
	}, 100);

	window.handleChatInput = (e) => {
		if (e.key === 'Enter') {
			const value = e.target.value.trim();
			if (value) {
				post('sendTeamMessage', { text: value });
				e.target.value = '';
			}
		}
	};

	window.endSession = function () {
		isEndingSession = true;
		const btn = document.querySelector('.end-session-btn');
		if (btn) {
			btn.textContent = 'Ending...';
			btn.disabled = true;
			btn.style.opacity = '0.6';
		}
		setTimeout(() => {
			resetButtonState('end');
			if (endingSessionTimer) {
				clearTimeout(endingSessionTimer);
				endingSessionTimer = null;
			}
			isEndingSession = false;
		}, 15000);
		post('endLiveShare');
	};

	window.leaveSession = function () {
		const btn = document.querySelector('.leave-session-btn');
		if (btn) {
			btn.textContent = 'Leaving...';
			btn.disabled = true;
			btn.style.opacity = '0.6';
		}
		setTimeout(() => resetButtonState('leave'), 10000);
		post('leaveLiveShare');
	};

	window.addEventListener('message', event => {
		const message = event.data;
		switch (message.command) {
			case 'aiResponse':
				appendAIMessage(message.text);
				break;
			case 'updateTeamInfo':
				updateTeamInfo(message.team, message.userId, message.teamMembers);
				break;
			case 'teamInfo': // fallback when no workspace is open
				updateTeamInfo(message.teamInfo, undefined);
				break;
			case 'fileSnapshotSaved':
				showFsFeedback('Snapshot saved.', 'ok');
				setSaving(false);
				// Pre-fill the summary input with the saved snapshot id
				const sumId = document.getElementById('fs-summary-id');
				if (sumId && message.id) sumId.value = message.id;
				break;
			case 'fileSnapshotError':
				showFsFeedback(message.error || 'Failed to save snapshot.', 'warn');
				setSaving(false);
				break;
			// summaryGenerated and summaryError handlers removed - edge function now handles automatic summarization
			case 'activityFeed':
				renderActivityFeed(message.items || []);
				break;
			case 'activityError':
				showActivityFeedback(message.error || 'Failed to load activity.');
				break;
			case 'updateAuthState':
				if (!message.authenticated) {
					persistFsIds({ userId: '', teamId: getState().teamId || '' });
					const u = document.getElementById('fs-userId');
					if (u) u.value = '';
				}
				break;
		}
	});

	function updateTeamInfo(team, userId, teamMembers) {
		console.log('Updating team info:', team);
		console.log('Team members received:', teamMembers);

		const teamName = document.getElementById('teamName');
		const teamRole = document.getElementById('teamRole');
		const teamJoinCode = document.getElementById('teamJoinCode');
		const joinCodeSection = document.getElementById('joinCodeSection');
		const deleteTeamBtn = document.getElementById('deleteTeamBtn');
		const leaveTeamBtn = document.getElementById('leaveTeamBtn');
		const fsTeamId = document.getElementById('fs-teamId');
		const fsUserId = document.getElementById('fs-userId');

		if (teamName) teamName.textContent = team?.name ?? '—';
		if (teamRole) teamRole.textContent = team?.role ?? '—';

		// Show/hide join code section based on whether user has a team
		if (teamJoinCode && joinCodeSection) {
			if (team?.joinCode && team.name !== 'No Team') {
				teamJoinCode.textContent = team.joinCode;
				joinCodeSection.style.display = 'block';
			} else {
				teamJoinCode.textContent = '—';
				joinCodeSection.style.display = 'none';
			}


			// Show delete button only for Admin; show leave button only for Member
			if (deleteTeamBtn) {
				deleteTeamBtn.style.display = (team?.name && team?.role === 'Admin') ? 'inline-block' : 'none';
			}
			if (leaveTeamBtn) {
				leaveTeamBtn.style.display = (team?.name && team?.role === 'Member') ? 'inline-block' : 'none';
			}
		}

		// Update Team Members section
		const teamMembersSection = document.getElementById('teamMembersSection');
		const memberCount = document.getElementById('memberCount');
		const membersList = document.getElementById('membersList');

		console.log('[liveSharePanel] Team Members Debug:', {
			hasSection: !!teamMembersSection,
			hasCount: !!memberCount,
			hasList: !!membersList,
			teamMembers: teamMembers,
			teamMembersLength: teamMembers?.length,
			teamName: team?.name
		});

		if (teamMembersSection && memberCount && membersList) {
			if (teamMembers && teamMembers.length > 0 && team?.name && team.name !== 'No Team') {
				console.log('[liveSharePanel] Showing Team Members section with', teamMembers.length, 'members');
				// Show the team members section
				teamMembersSection.style.display = 'block';
				memberCount.textContent = teamMembers.length;

				// Clear existing members
				membersList.innerHTML = '';

				// Add each member to the list
				teamMembers.forEach(member => {
					const memberItem = document.createElement('div');
					memberItem.className = 'member-item';

					// Format name - Priority: displayName > full_name > email > userId
					let displayName = member.displayName;
					if (!displayName && (member.firstName || member.lastName)) {
						displayName = [member.firstName, member.lastName].filter(Boolean).join(' ');
					}
					if (!displayName) {
						displayName = member.email;
					}
					if (!displayName || displayName === 'Unknown') {
						displayName = member.userId;
					}

					// Format joined date
					const joinedDate = new Date(member.joinedAt);
					const formattedDate = joinedDate.toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric'
					});

					// Format skills
					let skillsHtml = '';
					if (member.skills && member.skills.length > 0) {
						const skillTags = member.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');
						skillsHtml = `<div class="member-skills">${skillTags}</div>`;
					} else {
						skillsHtml = '<div class="member-skills"><span class="skill-tag no-skills">Skills: None</span></div>';
					}

					memberItem.innerHTML = `
						<span class="member-role-badge ${member.role}">${member.role}</span>
						<div class="member-info">
							<div class="member-name">${displayName}</div>
							<div class="member-email">${member.email}</div>
							${skillsHtml}
						</div>
						<div class="member-joined">Joined ${formattedDate}</div>
					`;

					membersList.appendChild(memberItem);
				});
			} else {
				console.log('[liveSharePanel] Hiding Team Members section');
				teamMembersSection.style.display = 'none';
			}
		} else {
			console.error('[liveSharePanel] Team Members elements not found:', {
				hasSection: !!teamMembersSection,
				hasCount: !!memberCount,
				hasList: !!membersList
			});
		}

		if (fsTeamId) fsTeamId.value = team?.id || '';
		if (fsUserId && userId) fsUserId.value = userId;
		persistFsIds({ userId: (fsUserId && fsUserId.value) || '', teamId: (fsTeamId && fsTeamId.value) || '' });

		// Refresh the activity feed when team context changes
		try {
			if (team?.id) {
				requestActivityFeed();
			} else {
				// Clear list when no team
				const list = document.getElementById('activityList');
				if (list) list.innerHTML = '<div style="opacity:0.8;font-size:12px;">No active team.</div>';
			}
		} catch (e) {}
	}

	// Toggle team members list
	window.toggleTeamMembers = function() {
		const membersList = document.getElementById('membersList');
		const toggleIcon = document.querySelector('.members-toggle-icon');
		if (membersList && toggleIcon) {
			const isHidden = membersList.style.display === 'none';
			membersList.style.display = isHidden ? 'block' : 'none';
			if (isHidden) {
				toggleIcon.classList.add('expanded');
			} else {
				toggleIcon.classList.remove('expanded');
			}
		}
	};

	function appendAIMessage(text) {
		const chatLog = document.getElementById('ai-chat-log');
		if (!chatLog) return; // Chat UI not present anymore
		const msgDiv = document.createElement('div');
		msgDiv.className = 'chat-message ai-message';
		msgDiv.textContent = `Agent: ${text}`;
		chatLog.appendChild(msgDiv);
		chatLog.scrollTop = chatLog.scrollHeight;
		}

	function addChatMessage(sender, text, timestamp) {
		const box = document.getElementById('chatMessages');
		if (!box) return;
		const div = document.createElement('div');
		div.className = 'chat-message';
		div.innerHTML = `<strong>${sender}:</strong> ${text} <small>(${timestamp})</small>`;
		box.appendChild(div);
		box.scrollTop = box.scrollHeight;
	}

	function updateTeamActivity(activity) {
		console.log('Activity update:', activity);
	}

	function updateSessionStatus(status, link, participants, role, duration) {
		const statusDiv = document.getElementById('sessionStatus');
		const btns = document.getElementById('sessionButtons');
		const chatInput = document.getElementById('chatInput');
		if (!statusDiv) return;

		const participantCount = participants || 1;
		const sessionDuration = duration || '0m';

		if (link && link.trim()) {
			window.__collabAgentLastLink = link;
		}
		const effectiveLink = window.__collabAgentLastLink;

		if (isEndingSession && status === 'joined') {
			return;
		}

		if (chatInput) {
			if (status === 'hosting' || status === 'joined') {
				chatInput.disabled = false;
				if (chatInput.placeholder.indexOf('Start or join') === 0) {
					chatInput.placeholder = 'Type a message to your team...';
				}
			} else {
				chatInput.disabled = true;
				chatInput.placeholder = 'Start or join a session to chat';
			}
		}

		if (status === 'loading') {
			if (btns) btns.style.display = 'block';
			statusDiv.innerHTML = `
				<div class="status-inactive">
					<span class="status-indicator loading"></span>
					Loading session status...
				</div>`;
			return;
		}

		if (status === 'hosting') {
			if (btns) btns.style.display = 'none';
			const existingDuration = statusDiv.querySelector('[data-collab-duration]');
			const existingParticipants = statusDiv.querySelector('[data-collab-participants]');
			const existingLink = statusDiv.querySelector('[data-collab-link] code');
			// If we just captured a link and there's no code element yet, we must rebuild
			const already = existingDuration && existingParticipants && statusDiv.innerHTML.includes('Hosting Live Share Session') && (effectiveLink ? !!existingLink : true);
			if (already) {
				existingDuration.textContent = sessionDuration;
				existingParticipants.textContent = participantCount;
				if (existingLink && effectiveLink) existingLink.textContent = effectiveLink;
			} else {
				const linkSection = effectiveLink ? `
				<div class=\"session-link\" data-collab-link>Link: <code>${effectiveLink}</code>
					<button class=\"button small\" onclick=\"copyManualLink()\">Copy</button>
				</div>` : `
				<div class=\"session-link manual-entry\" data-collab-link>
					<div style=\"margin-bottom:4px; font-size:11px; opacity:0.8;\">Click to capture the current Live Share invite link from your clipboard.</div>
					<div style=\"display:flex; gap:4px;\">
						<button class=\"button small\" onclick=\"pasteManualLink()\">Capture From Clipboard</button>
					</div>
					<div id=\"manualLinkFeedback\" style=\"margin-top:4px; font-size:11px; color: var(--vscode-descriptionForeground);\"></div>
				</div>`;
				statusDiv.innerHTML = `
					<div class=\"status-active\">
						<span class=\"status-indicator active\"></span>
						<strong>Hosting Live Share Session</strong>
						<div class=\"session-info\">
							<div>Participants: <span data-collab-participants>${participantCount}</span></div>
							<div>Duration: <span data-collab-duration>${sessionDuration}</span></div>
							${linkSection}
							<button class=\"button end-session-btn\" onclick=\"endSession()\">End Session</button>
						</div>
					</div>`;
			}
			return;
		}

		if (status === 'joined') {
			if (btns) btns.style.display = 'none';
			const existingDuration = statusDiv.querySelector('[data-collab-duration]');
			const existingParticipants = statusDiv.querySelector('[data-collab-participants]');
			const already = existingDuration && existingParticipants && statusDiv.innerHTML.includes('Joined Live Share Session');
			if (already) {
				existingDuration.textContent = sessionDuration;
				existingParticipants.textContent = participantCount;
			} else {
				statusDiv.innerHTML = `
					<div class="status-active">
						<span class="status-indicator active"></span>
						<strong>Joined Live Share Session</strong>
						<div class="session-info">
							<div>Participants: <span data-collab-participants>${participantCount}</span></div>
							<div>Duration: <span data-collab-duration>${sessionDuration}</span></div>
							<div>Role: Guest</div>
							<button class="button leave-session-btn" onclick="leaveSession()">Leave Session</button>
						</div>
					</div>`;
			}
			return;
		}

		if (status === 'ended') {
			if (endingSessionTimer) clearTimeout(endingSessionTimer);
			statusDiv.innerHTML = `
				<div class="status-inactive">
					<span class="status-indicator loading"></span>
					<strong>Cleaning up session...</strong>
					<div style="font-size:12px; color:var(--vscode-descriptionForeground); margin-top:4px;">Session controls will be available shortly</div>
				</div>`;
			endingSessionTimer = setTimeout(() => {
				isEndingSession = false;
				endingSessionTimer = null;
				if (btns) btns.style.display = 'block';
				statusDiv.innerHTML = `
					<div class="status-inactive">
						<span class="status-indicator"></span>
						No active session
					</div>`;
			}, 8000);
			return;
		}

		if (!isEndingSession) {
			if (endingSessionTimer) {
				clearTimeout(endingSessionTimer);
				endingSessionTimer = null;
			}
			if (btns) btns.style.display = 'block';
			statusDiv.innerHTML = `
				<div class="status-inactive">
					<span class="status-indicator"></span>
					No active session
				</div>`;
		}
	}

	function resetButtonState(type) {
		const selector = type === 'end' ? '.end-session-btn' : '.leave-session-btn';
		const btn = document.querySelector(selector);
		if (btn) {
			btn.textContent = type === 'end' ? 'End Session' : 'Leave Session';
			btn.disabled = false;
			btn.style.opacity = '1';
			btn.style.cursor = 'pointer';
		}
	}

	function updateParticipants(participants, count) {
		const container = document.getElementById('teamActivity');
		if (!container) return;
		if (participants && participants.length) {
			const items = participants.map(p => (
				`<div class="participant-item">` +
				`<span class="status-indicator active"></span>` +
				`<span class="participant-name">${p.name}</span>` +
				`<span class="participant-role">${p.role}</span>` +
				`</div>`
			)).join('');
			container.innerHTML = `
				<div class="participant-list">
					<h4>Active Participants (${count})</h4>
					${items}
				</div>`;
		} else {
			container.innerHTML = `
				<div class="activity-item">
					<span class="status-indicator"></span>
					<strong>You:</strong> Ready to collaborate
				</div>`;
		}
	}

	window.addEventListener('message', (e) => {
		const m = e.data;
		switch (m.command) {
			case 'addMessage':
				addChatMessage(m.sender, m.message, m.timestamp);
				break;
			case 'updateActivity':
				updateTeamActivity(m.activity);
				break;
			case 'updateSessionStatus':
				updateSessionStatus(m.status, m.link, m.participants, m.role, m.duration);
				break;
			case 'updateParticipants':
				updateParticipants(m.participants, m.count);
				break;
			case 'resetButtonState':
				resetButtonState(m.buttonType);
				break;
			case 'storedLink':
				window.__collabAgentLastLink = m.link;
				updateSessionStatus('hosting', m.link, undefined, 'host', undefined);
				break;
			case 'manualLinkUpdated':
				if (m.link) {
					window.__collabAgentLastLink = m.link;
					updateSessionStatus('hosting', m.link);
					showManualLinkFeedback('Link stored.', 'ok');
				}
				break;
			case 'manualLinkCleared':
				window.__collabAgentLastLink = '';
				updateSessionStatus('hosting', '');
				showManualLinkFeedback('Link cleared.', 'info');
				break;
			case 'manualLinkPasted':
				if (m.link) {
					window.__collabAgentLastLink = m.link;
					// Force full re-render so link appears immediately
					updateSessionStatus('hosting', m.link, 1);
					showManualLinkFeedback('Link pasted & stored.', 'ok');
				}
				break;
			case 'manualLinkInvalid':
				showManualLinkFeedback('Please enter a link before clicking Set.', 'warn');
				break;
			case 'manualLinkPasteInvalid':
				showManualLinkFeedback('Clipboard was empty.', 'warn');
				break;
			case 'refreshActivityFeed':
				// Refresh the activity feed when Live Share events occur
				console.log('Refreshing activity feed due to Live Share event');
				requestActivityFeed();
				break;
		}
	});

	function showManualLinkFeedback(msg, kind) {
		const el = document.getElementById('manualLinkFeedback');
		if (!el) return;
		let color = 'var(--vscode-descriptionForeground)';
		if (kind === 'ok') color = 'var(--vscode-testing-iconPassed)';
		if (kind === 'warn') color = 'var(--vscode-editorWarning-foreground, orange)';
		el.style.color = color;
		el.textContent = msg;
	}

	// Manual invite link helpers
	window.pasteManualLink = function () {
		// Provide immediate visual pending feedback if field exists
		const fb = document.getElementById('manualLinkFeedback');
		if (fb) { fb.textContent = 'Capturing from clipboard...'; }
		post('manualPasteInviteLink');
	};
	window.copyManualLink = function () {
		if (window.__collabAgentLastLink) {
			navigator.clipboard.writeText(window.__collabAgentLastLink).catch(()=>{});
		}
	};

	// Ask backend if there is a stored link when webview loads
	post('requestStoredLink');

	// File Snapshot form helpers
	function setupSnapshotForm() {
		const idEl = document.getElementById('fs-id');
		const atEl = document.getElementById('fs-updatedAt');
		const regenBtn = document.getElementById('fs-generateIdBtn');
		const addBtn = document.getElementById('fs-addBtn');
		const uEl = document.getElementById('fs-userId');
		const tEl = document.getElementById('fs-teamId');
		const feedbackAnchor = document.getElementById('fs-feedback');

		// restore from persisted state on refresh
		const state = getState();
		if (uEl && !uEl.value && state.userId) uEl.value = state.userId;
		if (tEl && !tEl.value && state.teamId) tEl.value = state.teamId;
		if (idEl && !idEl.value) idEl.value = generateUUID();
		if (atEl && !atEl.value) atEl.value = new Date().toISOString();
		if (regenBtn && !regenBtn.hasAttribute('data-listener-added')) {
			regenBtn.addEventListener('click', function(){
				regenerateSnapshotId();
			});
			regenBtn.setAttribute('data-listener-added','true');
		}
		if (addBtn && !addBtn.hasAttribute('data-listener-added')) {
			addBtn.addEventListener('click', function(){
				const payload = collectSnapshotPayload();
				if (!payload) return;
				setSaving(true);
				post('addFileSnapshot', { payload });
				setTimeout(() => { if (isSaving()) showFsFeedback('Saving…', 'info'); }, 1500);
			});
			addBtn.setAttribute('data-listener-added','true');
		}

		// Generate Summary section removed - edge function now handles automatic summarization
	}

	// Activity Feed UI and behavior
	function setupActivityFeed(){
		const anchor = document.getElementById('fs-summary-feedback');
		if (!anchor || document.getElementById('activityFeedSection')) return;
		const section = document.createElement('div');
		section.id = 'activityFeedSection';
		section.className = 'section';
		section.innerHTML = `
			<div class="section-header" style="margin-top:12px;">
				<div class="section-title">Team Activity Timeline</div>
				<div class="info-icon-wrapper">
					<svg class="info-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
						<circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
						<text x="8" y="11.5" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">i</text>
					</svg>
					<div class="tooltip">
						View your team's recent activity and changes. Track file snapshots, code changes, and collaboration events in real-time. Activities are automatically summarized using AI.
					</div>
				</div>
			</div>
			<div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
				<button class="button" id="activityRefreshBtn" title="Reload feed">Refresh</button>
				<select id="activityFilterDropdown" class="dropdown" title="Filter events by type" style="padding:4px 8px; font-size:12px; border:1px solid var(--vscode-input-border); background:var(--vscode-input-background); color:var(--vscode-input-foreground); border-radius:4px; cursor:pointer;">
					<option value="all">All</option>
					<option value="ai_task_recommendation">Task Delegation</option>
					<option value="initial_snapshot">Initial Snapshot</option>
					<option value="changes">Changes</option>
					<option value="live_share_started">Started Live Share</option>
					<option value="live_share_ended">Ended Live Share</option>
					<option value="participant_status">Participant Status</option>
				</select>
				<span id="activityFeedback" style="font-size:12px; color: var(--vscode-descriptionForeground);"></span>
			</div>
			<div id="activityList" class="activity-list" style="display:flex; flex-direction:column; gap:8px;"></div>
		`;
		anchor.insertAdjacentElement('afterend', section);

		const refresh = document.getElementById('activityRefreshBtn');
		if (refresh && !refresh.hasAttribute('data-listener-added')){
			refresh.addEventListener('click', requestActivityFeed);
			refresh.setAttribute('data-listener-added','true');
		}

		const filterDropdown = document.getElementById('activityFilterDropdown');
		if (filterDropdown && !filterDropdown.hasAttribute('data-listener-added')){
			filterDropdown.addEventListener('change', filterActivityFeed);
			filterDropdown.setAttribute('data-listener-added','true');
		}

		// initial load if a team is present
		requestActivityFeed();
	}

	function requestActivityFeed(){
		const teamId = document.getElementById('fs-teamId')?.value?.trim();
		if (!teamId){
			showActivityFeedback('No active team.');
			return;
		}
		showActivityFeedback('Loading…');
		post('loadActivityFeed', { teamId, limit: 25 });
	}

	function filterActivityFeed(){
		// Re-render the activity feed with the current filter applied
		if (currentActivityItems && currentActivityItems.length > 0) {
			renderActivityFeed(currentActivityItems);
		}
	}

	function renderActivityFeed(items){
		const list = document.getElementById('activityList');
		if (!list) return;

		// Store items for viewChanges function
		currentActivityItems = items;

		if (!items.length){
			list.innerHTML = '<div style="opacity:0.8;font-size:12px;">No recent activity.</div>';
			showActivityFeedback('');
			return;
		}

		// Apply filter based on dropdown selection
		const filterDropdown = document.getElementById('activityFilterDropdown');
		const filterValue = filterDropdown ? filterDropdown.value : 'all';

		let filteredItems = items;
		if (filterValue !== 'all') {
			filteredItems = items.filter(it => {
				const activityType = it.activity_type || 'file_snapshot';
				const hasSnapshot = it.snapshot && Object.keys(it.snapshot || {}).length > 0;
				const hasChanges = it.changes && it.changes.trim().length > 0 && it.changes !== '{}';

				// Map filter value to activity type or condition
				if (filterValue === 'ai_task_recommendation') {
					return activityType === 'ai_task_recommendation';
				} else if (filterValue === 'initial_snapshot') {
					return activityType === 'initial_snapshot' || (hasSnapshot && !hasChanges);
				} else if (filterValue === 'changes') {
					return hasChanges && activityType !== 'live_share_ended';
				} else if (filterValue === 'live_share_started') {
					return activityType === 'live_share_started';
				} else if (filterValue === 'live_share_ended') {
					return activityType === 'live_share_ended';
				} else if (filterValue === 'participant_status') {
					return activityType === 'participant_status';
				}
				return true;
			});
		}

		if (!filteredItems.length){
			list.innerHTML = '<div style="opacity:0.8;font-size:12px;">No activities match the selected filter.</div>';
			showActivityFeedback('');
			return;
		}

		const html = filteredItems.map((it, index)=>{
			const when = it.created_at ? new Date(it.created_at).toLocaleString() : '';
			// Use display_name from backend with fallback priority: display_name -> email -> user_id
		const who = it.display_name || it.user_email || (it.user_id ? it.user_id.substring(0,8)+'…' : '');
			const eventHeader = it.event_header || it.summary || '';  // Use event_header as display text
			const summary = it.summary || '';  // AI-generated summary
			const activityType = it.activity_type || 'file_snapshot';
			const itemId = `activity-item-${index}`;
			const detailsId = `activity-details-${index}`;

			// Determine icon/tag and buttons based on activity type and whether it has changes or snapshot
			let icon = '';
			let buttons = '';

			// Helper to determine if this is an initial snapshot vs automatic snapshot (changes)
			const hasSnapshot = it.snapshot && Object.keys(it.snapshot || {}).length > 0;
			const hasChanges = it.changes && it.changes.trim().length > 0 && it.changes !== '{}';

			if (activityType === 'live_share_started') {
				// Bright green tag for session start
				icon = '<span style="display:inline-block; padding:2px 8px; font-size:10px; font-weight:600; background-color:#4caf50; color:#ffffff; border-radius:4px; margin-right:6px;">Started Live Share</span>';
				// Show View Initial Snapshot button for started events
				buttons = `
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewSnapshot('${it.id}')" title="View the initial file snapshot">View Initial Snapshot</button>
				`;
			} else if (activityType === 'live_share_ended') {
				// Red tag for session end
				icon = '<span style="display:inline-block; padding:2px 8px; font-size:10px; font-weight:600; background-color:#f44336; color:#ffffff; border-radius:4px; margin-right:6px;">Ended Live Share</span>';
				// Show View Changes and View Summary (removed View Initial Snapshot)
				buttons = `
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewChanges('${it.id}')" title="View the git diff changes">View Changes</button>
					${summary ? `<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewSummary('${it.id}')" title="View AI-generated summary">View Summary</button>` : ''}
				`;
			} else if (activityType === 'participant_status') {
				// Participant Status: membership changes (non-clickable informational event)
				// Styled similar to Initial Snapshot (bordered) but using white instead of green
				icon = '<span style="display:inline-block; padding:2px 8px; font-size:10px; font-weight:600; border:1.5px solid #ffffff; color:#ffffff; border-radius:4px; margin-right:6px;">Participant Status</span>';
				// No buttons => non-clickable
			} else if (activityType === 'ai_task_recommendation') {
				// Purple badge for AI task recommendations
				icon = '<span style="display:inline-block; padding:2px 8px; font-size:10px; font-weight:600; border:1.5px solid var(--vscode-charts-purple); color:var(--vscode-charts-purple); border-radius:4px; margin-right:6px;">Task Delegation</span>';
				// Show View Reason button
				buttons = `
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewTaskReason('${it.id}')" title="View AI's reasoning for this recommendation">View Reason</button>
				`;
			} else if (activityType === 'initial_snapshot' || (hasSnapshot && !hasChanges)) {
				// INITIAL SNAPSHOT: Has full snapshot, no changes
				icon = '<span style="display:inline-block; padding:2px 8px; font-size:10px; font-weight:600; border:1.5px solid #4caf50; color:#4caf50; border-radius:4px; margin-right:6px;">Initial Snapshot</span>';
				// Only show "View Initial Snapshot" button
				buttons = `
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewSnapshot('${it.id}')" title="View the full workspace snapshot">View Initial Snapshot</button>
				`;
			} else if (hasChanges) {
				// AUTOMATIC SNAPSHOT (Changes): Has changes/diff
				icon = '<span style="display:inline-block; padding:2px 8px; font-size:10px; font-weight:600; border:1.5px solid #ffc107; color:#ffc107; border-radius:4px; margin-right:6px;">Changes</span>';
				// Only show "View Changes" and "View Summary" buttons
				buttons = `
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewChanges('${it.id}')" title="View the git diff changes">View Changes</button>
					${summary ? `<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewSummary('${it.id}')" title="View AI-generated summary">View Summary</button>` : ''}
				`;
			} else {
				// Fallback for other types (shouldn't normally happen)
				icon = '<span style="display:inline-block; padding:2px 8px; font-size:10px; font-weight:600; border:1.5px solid #888; color:#888; border-radius:4px; margin-right:6px;">Snapshot</span>';
				buttons = `
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewSnapshot('${it.id}')" title="View snapshot">View Snapshot</button>
				`;
			}

			// Only show details section if there are buttons
			const detailsSection = buttons ? `
				<div id="${detailsId}" style="display:none; margin-top:8px; padding-top:8px; border-top:1px solid var(--vscode-editorWidget-border);">
					<div style="display:flex; gap:6px; flex-wrap:wrap;">
						${buttons}
					</div>
				</div>
			` : '';

			return `
				<div class="activity-item" style="border:1px solid var(--vscode-editorWidget-border); padding:12px; border-radius:6px; background: var(--vscode-editor-background);">
					<div id="${itemId}" style="cursor:${buttons ? 'pointer' : 'default'}; user-select:none;" ${buttons ? `onclick="toggleActivityDetails('${detailsId}')"` : ''}>
						<div style="font-size:11px; color: var(--vscode-descriptionForeground); opacity:0.8;">
							${icon} ${when} • ${who}
						</div>
						<div style="margin-top:6px; font-size:13px; font-weight:500; line-height:1.4;">${escapeHtml(eventHeader)}</div>
					</div>
					${detailsSection}
				</div>
			`;
		}).join('');
		list.innerHTML = html;
		showActivityFeedback('');
	}

	// Toggle details visibility for activity items
	window.toggleActivityDetails = function(detailsId) {
		const details = document.getElementById(detailsId);
		if (details) {
			details.style.display = details.style.display === 'none' ? 'block' : 'none';
		}
	};

	// Store activity items for later reference
	let currentActivityItems = [];

	// View initial snapshot function
	window.viewSnapshot = function(activityId) {
		console.log('View snapshot for activity:', activityId);

		// Find the activity item
		const activity = currentActivityItems.find(item => item.id === activityId);
		if (!activity) {
			console.error('Activity not found:', activityId);
			return;
		}

		// Check if this activity has a snapshot
		if (activity.snapshot) {
			// Show snapshot in a modal
			showSnapshotModal(activity.snapshot, activity.event_header || 'Initial Snapshot');
		} else {
			console.log('No snapshot available for this activity');
			console.log('Activity data:', activity);
		}
	};

	window.viewChanges = function(activityId) {
		console.log('View changes for activity:', activityId);

		// Find the activity item
		const activity = currentActivityItems.find(item => item.id === activityId);
		if (!activity) {
			console.error('Activity not found:', activityId);
			return;
		}

		// Check if this activity has changes (from file_snapshots via source_snapshot_id)
		if (activity.changes) {
			// Show diff in a modal or panel
			showDiffModal(activity.changes, 'Git Diff - ' + (activity.summary || 'Changes'));
		} else {
			console.log('No changes available for this activity');
			console.log('Activity data:', activity);
		}
	};

	window.viewSummary = function(activityId) {
		console.log('View summary for activity:', activityId);

		// Find the activity item
		const activity = currentActivityItems.find(item => item.id === activityId);
		if (!activity) {
			console.error('Activity not found:', activityId);
			return;
		}

		// Check if this activity has an AI summary
		if (activity.summary) {
			// Show AI summary in a modal (event_header is the event description)
			showSummaryModal(activity.summary, activity.event_header || 'Activity');
		} else {
			console.log('No AI summary available for this activity');
			console.log('Activity data:', activity);
		}
	};

	window.viewTaskReason = function(activityId) {
		console.log('View task recommendation reason for activity:', activityId);

		// Find the activity item
		const activity = currentActivityItems.find(item => item.id === activityId);
		if (!activity) {
			console.error('Activity not found:', activityId);
			return;
		}

		// Check if this activity has a summary (reason)
		if (activity.summary) {
			// Show the AI's reasoning in a modal
			showSummaryModal(activity.summary, activity.event_header || 'Task Recommendation');
		} else {
			console.log('No reason available for this task recommendation');
			console.log('Activity data:', activity);
		}
	};

	function showDiffModal(diffContent, title) {
		// Create modal overlay
		const existingModal = document.getElementById('diffModal');
		if (existingModal) {
			existingModal.remove();
		}

		const modal = document.createElement('div');
		modal.id = 'diffModal';
		modal.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0,0,0,0.7);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 10000;
			padding: 20px;
		`;

		// Format the diff content with syntax highlighting
		const formattedDiff = formatGitDiff(diffContent);

		modal.innerHTML = `
			<div style="
				background: var(--vscode-editor-background);
				border: 1px solid var(--vscode-editorWidget-border);
				border-radius: 6px;
				width: 90%;
				max-width: 900px;
				max-height: 80vh;
				display: flex;
				flex-direction: column;
			">
				<div style="
					padding: 16px;
					border-bottom: 1px solid var(--vscode-editorWidget-border);
					display: flex;
					justify-content: space-between;
					align-items: center;
				">
					<h3 style="margin: 0;">${escapeHtml(title || 'Git Diff')}</h3>
					<button class="button" onclick="document.getElementById('diffModal').remove()">Close</button>
				</div>
				<div style="
					padding: 8px;
					overflow: auto;
					flex: 1;
					font-family: var(--vscode-editor-font-family, 'Courier New', monospace);
					font-size: 13px;
					line-height: 1.6;
					background: var(--vscode-editor-background);
				">${formattedDiff}</div>
			</div>
		`;

		document.body.appendChild(modal);

		// Close on background click
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				modal.remove();
			}
		});
	}

	function showSummaryModal(aiSummary, eventTitle) {
		// Create modal overlay
		const existingModal = document.getElementById('summaryModal');
		if (existingModal) {
			existingModal.remove();
		}

		const modal = document.createElement('div');
		modal.id = 'summaryModal';
		modal.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0,0,0,0.7);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 10000;
			padding: 20px;
		`;

		modal.innerHTML = `
			<div style="
				background: var(--vscode-editor-background);
				border: 1px solid var(--vscode-editorWidget-border);
				border-radius: 6px;
				width: 90%;
				max-width: 700px;
				max-height: 80vh;
				display: flex;
				flex-direction: column;
			">
				<div style="
					padding: 16px;
					border-bottom: 1px solid var(--vscode-editorWidget-border);
					display: flex;
					justify-content: space-between;
					align-items: center;
				">
					<h3 style="margin: 0;">AI Summary</h3>
					<button class="button" onclick="document.getElementById('summaryModal').remove()">Close</button>
				</div>
				<div style="padding: 20px;">
					<div style="
						font-size: 11px;
						color: var(--vscode-descriptionForeground);
						opacity: 0.8;
						margin-bottom: 12px;
					">Event</div>
					<div style="
						font-size: 13px;
						font-weight: 500;
						margin-bottom: 20px;
						padding: 12px;
						background: var(--vscode-editorWidget-background);
						border-radius: 4px;
					">${escapeHtml(eventTitle)}</div>

					<div style="
						font-size: 11px;
						color: var(--vscode-descriptionForeground);
						opacity: 0.8;
						margin-bottom: 12px;
					">What was accomplished</div>
					<div style="
						font-size: 14px;
						line-height: 1.6;
						padding: 16px;
						background: var(--vscode-textBlockQuote-background);
						border-left: 3px solid var(--vscode-textBlockQuote-border);
						border-radius: 4px;
					">${escapeHtml(aiSummary)}</div>
				</div>
			</div>
		`;

		document.body.appendChild(modal);

		// Close on background click
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				modal.remove();
			}
		});
	}

	function showSnapshotModal(snapshotContent, title) {
		// Create modal overlay
		const existingModal = document.getElementById('snapshotModal');
		if (existingModal) {
			existingModal.remove();
		}

		const modal = document.createElement('div');
		modal.id = 'snapshotModal';
		modal.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0,0,0,0.7);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 10000;
			padding: 20px;
		`;

		// Format the snapshot content with file tree view
		const formattedSnapshot = formatSnapshot(snapshotContent);

		modal.innerHTML = `
			<div style="
				background: var(--vscode-editor-background);
				border: 1px solid var(--vscode-editorWidget-border);
				border-radius: 6px;
				width: 90%;
				max-width: 1000px;
				max-height: 85vh;
				display: flex;
				flex-direction: column;
			">
				<div style="
					padding: 16px;
					border-bottom: 1px solid var(--vscode-editorWidget-border);
					display: flex;
					justify-content: space-between;
					align-items: center;
					background: var(--vscode-titleBar-activeBackground);
				">
					<h3 style="margin: 0; color: var(--vscode-titleBar-activeForeground);">${escapeHtml(title || 'Workspace Snapshot')}</h3>
					<button class="button" onclick="document.getElementById('snapshotModal').remove()">Close</button>
				</div>
				<div style="
					padding: 16px;
					overflow: auto;
					flex: 1;
					background: var(--vscode-editor-background);
				">${formattedSnapshot}</div>
			</div>
		`;

		document.body.appendChild(modal);

		// Close on background click
		modal.addEventListener('click', (e) => {
			if (e.target === modal) {
				modal.remove();
			}
		});
	}

	function showActivityFeedback(msg){
		const el = document.getElementById('activityFeedback');
		if (el) el.textContent = msg || '';
	}

	function escapeHtml(str){
		return (str||'').replace(/[&<>\"]+/g, function(s){
			return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s]);
		});
	}

	/**
	 * Formats git diff content with proper line breaks and syntax highlighting
	 * Converts escape sequences to actual whitespace and adds GitHub-style colors
	 */
	function formatGitDiff(diffContent) {
		if (!diffContent || typeof diffContent !== 'string') {
			return '<div style="color: var(--vscode-descriptionForeground);">No changes available</div>';
		}

		// Step 1: Decode escape sequences
		// Handle various escape sequence formats that might be in the database
		let decoded = diffContent
			.replace(/\\r\\n/g, '\n')  // \r\n → newline
			.replace(/\\n/g, '\n')      // \n → newline
			.replace(/\\r/g, '\n')      // \r → newline
			.replace(/\\t/g, '\t');     // \t → tab

		// Step 2: Split into lines
		const lines = decoded.split('\n');

		// Step 3: Format each line with appropriate styling
		const formattedLines = lines.map(line => {
			const escapedLine = escapeHtml(line);

			// File headers (diff --git, index, +++, ---)
			if (line.startsWith('diff --git') || line.startsWith('index ') ||
			    line.startsWith('---') || line.startsWith('+++')) {
				return `<div style="color: var(--vscode-descriptionForeground); font-weight: bold;">${escapedLine}</div>`;
			}
			// Hunk headers (@@ ... @@)
			else if (line.startsWith('@@')) {
				return `<div style="color: var(--vscode-textPreformat-foreground); background: var(--vscode-textBlockQuote-background); padding: 2px 4px; margin: 4px 0;">${escapedLine}</div>`;
			}
			// Added lines (green)
			else if (line.startsWith('+')) {
				return `<div style="background: rgba(46, 160, 67, 0.2); color: var(--vscode-gitDecoration-addedResourceForeground, #46a043); padding: 1px 4px;">${escapedLine}</div>`;
			}
			// Deleted lines (red)
			else if (line.startsWith('-')) {
				return `<div style="background: rgba(248, 81, 73, 0.2); color: var(--vscode-gitDecoration-deletedResourceForeground, #f85149); padding: 1px 4px;">${escapedLine}</div>`;
			}
			// Context lines (unchanged)
			else {
				return `<div style="color: var(--vscode-editor-foreground); padding: 1px 4px;">${escapedLine}</div>`;
			}
		});

		return formattedLines.join('');
	}

	/**
	 * Builds a hierarchical tree structure from flat file paths
	 * @param {Object} snapshot - Object with file paths as keys and content as values
	 * @returns {Object} Tree structure
	 */
	function buildFileTree(snapshot) {
		const tree = {};
		const filePaths = Object.keys(snapshot).sort();

		filePaths.forEach(filePath => {
			// Normalize path separators (handle both / and \)
			const normalizedPath = filePath.replace(/\\/g, '/');
			const parts = normalizedPath.split('/');
			let current = tree;

			parts.forEach((part, index) => {
				const isFile = index === parts.length - 1;

				if (isFile) {
					// This is a file
					if (!current.__files) current.__files = [];
					current.__files.push({
						name: part,
						fullPath: filePath,
						content: snapshot[filePath]
					});
				} else {
					// This is a folder
					if (!current[part]) {
						current[part] = {};
					}
					current = current[part];
				}
			});
		});

		return tree;
	}

	/**
	 * Counts total files in a tree (recursively)
	 */
	function countFilesInTree(tree) {
		let count = 0;

		if (tree.__files) {
			count += tree.__files.length;
		}

		Object.keys(tree).forEach(key => {
			if (key !== '__files') {
				count += countFilesInTree(tree[key]);
			}
		});

		return count;
	}

	/**
	 * Renders a file tree recursively
	 * @param {Object} tree - Tree structure from buildFileTree
	 * @param {Number} level - Indentation level
	 * @param {String} path - Current path (for unique IDs)
	 * @returns {String} HTML string
	 */
	function renderFileTree(tree, level, path) {
		level = level || 0;
		path = path || '';
		let html = '';
		const indent = level * 20;
		let itemIndex = 0;

		// Render folders first
		const folders = Object.keys(tree).filter(key => key !== '__files').sort();

		folders.forEach(folderName => {
			const folderId = 'folder-' + path + '-' + itemIndex++;
			const folderPath = path ? path + '/' + folderName : folderName;

			// Count files in this folder (recursively)
			const fileCount = countFilesInTree(tree[folderName]);

			html += '<div style="margin-bottom: 4px;">';
			html += '<div style="padding: 6px 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; padding-left: ' + (indent + 8) + 'px; border-radius: 4px; transition: background 0.1s;" ';
			html += 'onmouseover="this.style.background=\'var(--vscode-list-hoverBackground)\'" ';
			html += 'onmouseout="this.style.background=\'transparent\'" ';
			html += 'onclick="toggleFolder(\'' + folderId + '\')">';
			html += '<span id="' + folderId + '-icon" style="color: var(--vscode-descriptionForeground); font-size: 10px;">▶</span>';
			html += '<span style="color: var(--vscode-icon-foreground); margin-right: 4px;">📁</span>';
			html += '<strong style="color: var(--vscode-foreground);">' + escapeHtml(folderName) + '/</strong>';
			html += '<span style="color: var(--vscode-descriptionForeground); font-size: 11px; margin-left: auto;">(' + fileCount + ' file' + (fileCount !== 1 ? 's' : '') + ')</span>';
			html += '</div>';
			html += '<div id="' + folderId + '" style="display: none;">';
			html += renderFileTree(tree[folderName], level + 1, folderPath);
			html += '</div>';
			html += '</div>';
		});

		// Render files
		const files = tree.__files || [];
		files.forEach(function(file) {
			const fileId = 'file-' + path + '-' + itemIndex++;

			// Decode escape sequences in file content
			const decodedContent = (file.content || '')
				.replace(/\\r\\n/g, '\n')
				.replace(/\\n/g, '\n')
				.replace(/\\r/g, '\n')
				.replace(/\\t/g, '\t');

			const lineCount = decodedContent.split('\n').length;

			html += '<div style="margin-bottom: 8px; border: 1px solid var(--vscode-editorWidget-border); border-radius: 4px; overflow: hidden; margin-left: ' + indent + 'px;">';
			html += '<div style="background: var(--vscode-textBlockQuote-background); padding: 6px 10px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--vscode-editorWidget-border);" onclick="toggleFile(\'' + fileId + '\')">';
			html += '<div style="display: flex; align-items: center; gap: 8px;">';
			html += '<span id="' + fileId + '-icon" style="color: var(--vscode-descriptionForeground); font-size: 10px;">▶</span>';
			html += '<span style="color: var(--vscode-icon-foreground); margin-right: 4px;">📄</span>';
			html += '<strong style="color: var(--vscode-textLink-foreground); font-family: var(--vscode-editor-font-family, monospace);">' + escapeHtml(file.name) + '</strong>';
			html += '</div>';
			html += '<span style="color: var(--vscode-descriptionForeground); font-size: 11px;">' + lineCount + ' lines</span>';
			html += '</div>';
			html += '<div id="' + fileId + '" style="display: none; padding: 0; background: var(--vscode-editor-background);">';
			html += '<pre style="margin: 0; padding: 12px; overflow-x: auto; color: var(--vscode-editor-foreground); font-size: 13px; line-height: 1.6; font-family: var(--vscode-editor-font-family, \'Courier New\', monospace);">' + escapeHtml(decodedContent) + '</pre>';
			html += '</div>';
			html += '</div>';
		});

		return html;
	}

	/**
	 * Formats snapshot content (initial workspace snapshot) with proper formatting
	 * Displays files in a hierarchical folder tree with syntax-highlighted content
	 */
	function formatSnapshot(snapshotContent) {
		// Handle different snapshot formats
		let snapshot = snapshotContent;

		// If it's a string, try to parse as JSON
		if (typeof snapshotContent === 'string') {
			try {
				snapshot = JSON.parse(snapshotContent);
			} catch (e) {
				// If parsing fails, treat as raw text and decode escape sequences
				const decoded = snapshotContent
					.replace(/\\r\\n/g, '\n')
					.replace(/\\n/g, '\n')
					.replace(/\\r/g, '\n')
					.replace(/\\t/g, '\t');

				return '<pre style="margin: 0; color: var(--vscode-editor-foreground);">' + escapeHtml(decoded) + '</pre>';
			}
		}

		// If snapshot is not an object, return error
		if (!snapshot || typeof snapshot !== 'object') {
			return '<div style="color: var(--vscode-descriptionForeground);">No snapshot available</div>';
		}

		// Get all file paths
		const filePaths = Object.keys(snapshot);

		if (filePaths.length === 0) {
			return '<div style="color: var(--vscode-descriptionForeground);">Empty snapshot</div>';
		}

		// Build hierarchical tree structure
		const tree = buildFileTree(snapshot);

		// Add file count header
		let html = '<div style="padding: 8px; background: var(--vscode-textBlockQuote-background); border-radius: 4px; margin-bottom: 12px; color: var(--vscode-descriptionForeground);">';
		html += '<strong>' + filePaths.length + '</strong> file' + (filePaths.length !== 1 ? 's' : '') + ' captured';
		html += '</div>';

		// Render the tree
		html += renderFileTree(tree, 0, '');

		return html;
	}

	// Add toggle function to global scope for file expansion
	window.toggleFile = function(fileId) {
		const content = document.getElementById(fileId);
		const icon = document.getElementById(fileId + '-icon');

		if (content && icon) {
			if (content.style.display === 'none') {
				content.style.display = 'block';
				icon.textContent = '▼';
			} else {
				content.style.display = 'none';
				icon.textContent = '▶';
			}
		}
	};

	// Add toggle function for folders
	window.toggleFolder = function(folderId) {
		const content = document.getElementById(folderId);
		const icon = document.getElementById(folderId + '-icon');

		if (content && icon) {
			if (content.style.display === 'none') {
				content.style.display = 'block';
				icon.textContent = '▼';
			} else {
				content.style.display = 'none';
				icon.textContent = '▶';
			}
		}
	};

	function collectSnapshotPayload(){
		const id = document.getElementById('fs-id')?.value?.trim();
		const userId = document.getElementById('fs-userId')?.value?.trim();
		const teamId = document.getElementById('fs-teamId')?.value?.trim();
		const updatedAt = document.getElementById('fs-updatedAt')?.value?.trim();
		const filePath = document.getElementById('fs-filePath')?.value?.trim();
		const snapshot = document.getElementById('fs-snapshot')?.value?.trim();
		const changes = document.getElementById('fs-changes')?.value?.trim();
		if (!filePath || !snapshot || !changes){
			showFsFeedback('Please fill file path, snapshot and changes.', 'warn');
			return null;
		}
		return {
			id,
			user_id: userId || undefined,
			team_id: teamId || undefined,
			file_path: filePath,
			snapshot,
			changes,
			updated_at: updatedAt || undefined
		};
	}

	function regenerateSnapshotId(){
		const idEl = document.getElementById('fs-id');
		const atEl = document.getElementById('fs-updatedAt');
		if (idEl) idEl.value = generateUUID();
		if (atEl) atEl.value = new Date().toISOString();
		showFsFeedback('New ID generated.', 'info');
	}

	function showFsFeedback(msg, kind){
		const el = document.getElementById('fs-feedback');
		if (!el) return;
		let color = 'var(--vscode-descriptionForeground)';
		if (kind === 'ok') color = 'var(--vscode-testing-iconPassed)';
		if (kind === 'warn') color = 'var(--vscode-editorWarning-foreground, orange)';
		if (kind === 'info') color = 'var(--vscode-descriptionForeground)';
		el.style.color = color;
		el.textContent = msg;
	}

	// showSummaryFeedback function removed - no longer needed since edge function handles automatic summarization

	function getState(){
		return (vscode.getState && vscode.getState()) || {};
	}

	function persistFsIds({ userId, teamId }){
		const prev = getState();
		vscode.setState({ ...prev, userId, teamId });
	}

	let __saving = false;
	function setSaving(v){
		__saving = v;
		const btn = document.getElementById('fs-addBtn');
		if (btn){
			btn.disabled = !!v;
			btn.textContent = v ? 'Saving…' : 'Add Snapshot';
		}
	}
	function isSaving(){ return __saving; }

	function generateUUID(){
		if (window.crypto && window.crypto.randomUUID) {
			return window.crypto.randomUUID();
		}
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}

	function setupProfilePanel() {
		const saveBtn = document.getElementById('save-profile-btn');
		if (saveBtn && !saveBtn.hasAttribute('data-listener-added')) {
			saveBtn.addEventListener('click', handleSaveProfile);
			saveBtn.setAttribute('data-listener-added', 'true');
			console.log('Profile save button listener added');
		}
	}

	function handleSaveProfile() {
		const name = document.getElementById('profile-name')?.value || '';
		
		const interestsCheckboxes = document.querySelectorAll('input[name="interests"]:checked');
		const interests = Array.from(interestsCheckboxes).map(cb => cb.value);
		
		const customInterests = document.getElementById('custom-interests')?.value || '';
		if (customInterests) {
			const customArray = customInterests.split(',').map(s => s.trim()).filter(s => s);
			interests.push(...customArray);
		}
		
		const weaknessesCheckboxes = document.querySelectorAll('input[name="weaknesses"]:checked');
		const weaknesses = Array.from(weaknessesCheckboxes).map(cb => cb.value);
		
		const customWeaknesses = document.getElementById('custom-weaknesses')?.value || '';
		if (customWeaknesses) {
			const customArray = customWeaknesses.split(',').map(s => s.trim()).filter(s => s);
			weaknesses.push(...customArray);
		}

		const profileData = {
			name,
			interests,
			strengths: interests,
			weaknesses,
			custom_skills: []
		};

		const statusEl = document.getElementById('profile-status');
		if (statusEl) {
			statusEl.textContent = 'Saving...';
			statusEl.className = 'status-message';
		}

		post('saveProfile', { profileData });
	}

	function loadProfileData() {
		post('loadProfile');
	}

	window.addEventListener('message', event => {
		const message = event.data;

		switch (message.command) {
			case 'profileSaved':
				handleProfileSaved(message);
				break;
			case 'profileLoaded':
				handleProfileLoaded(message);
				break;
			case 'profileLoadError':
				handleProfileLoadError(message);
				break;
		}
	});

	function handleProfileSaved(message) {
		const statusEl = document.getElementById('profile-status');
		if (statusEl) {
			if (message.success) {
				statusEl.textContent = 'Profile saved successfully!';
				statusEl.className = 'status-message success';
			} else {
				statusEl.textContent = 'Error saving profile';
				statusEl.className = 'status-message error';
			}
			
			setTimeout(() => {
				statusEl.textContent = '';
				statusEl.className = 'status-message';
			}, 3000);
		}
	}

	function handleProfileLoaded(message) {
		console.log('[Profile] handleProfileLoaded called with:', message);

		if (!message.profile) {
			console.log('[Profile] No profile data received');
			return;
		}

		const profile = message.profile;
		console.log('[Profile] Profile data:', profile);

		// Clear name field first
		const nameInput = document.getElementById('profile-name');
		if (nameInput) {
			nameInput.value = profile.name || '';
			console.log('[Profile] Set name to:', profile.name);
		}

		// Clear all interest checkboxes first
		const allInterestCheckboxes = document.querySelectorAll('input[name="interests"]');
		allInterestCheckboxes.forEach(cb => {
			cb.checked = false;
		});
		console.log('[Profile] Cleared all interest checkboxes');

		if (profile.interests && Array.isArray(profile.interests)) {
			console.log('[Profile] Loading interests:', profile.interests);
			profile.interests.forEach(interest => {
				const checkbox = document.querySelector(`input[name="interests"][value="${interest}"]`);
				if (checkbox) {
					checkbox.checked = true;
					console.log('[Profile] Checked interest:', interest);
				} else {
					console.log('[Profile] Checkbox not found for interest:', interest);
				}
			});
	
			const predefinedInterests = ['Java', 'Python', 'TypeScript', 'JavaScript', 'C++', 'C#', 'Swift',
				'Frontend', 'Backend', 'Database', 'UI/UX', 'DevOps', 'Cloud', 'Security', 'Testing',
				'API', 'Documentation', 'Debugging'];
			const customInterests = profile.interests.filter(i => !predefinedInterests.includes(i));
			if (customInterests.length > 0) {
				const customInput = document.getElementById('custom-interests');
				if (customInput) {
					customInput.value = customInterests.join(', ');
				}
			}
		}
		
		if (profile.weaknesses && Array.isArray(profile.weaknesses)) {
			profile.weaknesses.forEach(weakness => {
				const checkbox = document.querySelector(`input[name="weaknesses"][value="${weakness}"]`);
				if (checkbox) {
					checkbox.checked = true;
				}
			});
	
			const predefinedWeaknesses = ['Java', 'Python', 'TypeScript', 'JavaScript', 'C++', 'C#', 'Swift',
				'Frontend', 'Backend', 'Database', 'UI/UX', 'DevOps', 'Cloud', 'Security', 'Testing',
				'API', 'Documentation', 'Debugging'];
			const customWeaknesses = profile.weaknesses.filter(w => !predefinedWeaknesses.includes(w));
			if (customWeaknesses.length > 0) {
				const customInput = document.getElementById('custom-weaknesses');
				if (customInput) {
					customInput.value = customWeaknesses.join(', ');
				}
			}
		}
	}

	function handleProfileLoadError(message) {
		console.error('Failed to load profile:', message.error);
	}
})();
