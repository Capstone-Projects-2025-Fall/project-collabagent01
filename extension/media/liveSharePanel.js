(function () {
	const vscode = acquireVsCodeApi();

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
				updateTeamInfo(message.team, message.userId);
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

	function updateTeamInfo(team, userId) {
		console.log('Updating team info:', team);
		
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

		if (fsTeamId) fsTeamId.value = team?.id || '';
		if (fsUserId && userId) fsUserId.value = userId;
		persistFsIds({ userId: (fsUserId && fsUserId.value) || '', teamId: (fsTeamId && fsTeamId.value) || '' });
	}

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
			<h3 style="margin-top:12px;">Team Activity Timeline</h3>
			<div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
				<button class="button" id="activityRefreshBtn" title="Reload feed">Refresh</button>
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
		const html = items.map((it, index)=>{
			const when = it.created_at ? new Date(it.created_at).toLocaleString() : '';
			const who = it.user_id ? it.user_id.substring(0,8)+'…' : '';
			const eventHeader = it.event_header || it.summary || '';  // Use event_header as display text
			const summary = it.summary || '';  // AI-generated summary
			const activityType = it.activity_type || 'file_snapshot';
			const itemId = `activity-item-${index}`;
			const detailsId = `activity-details-${index}`;

			// Determine icon and styling based on activity type
			let icon = '📄';
			let buttons = '';

			if (activityType === 'live_share_started') {
				// Green circle for session start
				icon = '<span style="display:inline-block; width:10px; height:10px; background-color:#4caf50; border-radius:50%; margin-right:6px;"></span>Live';
				// No buttons for started events
				buttons = '';
			} else if (activityType === 'live_share_ended') {
				// Red circle for session end
				icon = '<span style="display:inline-block; width:10px; height:10px; background-color:#f44336; border-radius:50%; margin-right:6px;"></span>Live';
				// Show View Changes and View Summary
				buttons = `
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewSnapshot('${it.id}')" title="View the initial file snapshot">View Initial Snapshot</button>
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewChanges('${it.id}')" title="View the git diff changes">View Changes</button>
					${summary ? `<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewSummary('${it.id}')" title="View AI-generated summary">View Summary</button>` : ''}
				`;
			} else if (activityType === 'ai_summary') {
				// Regular file snapshots - show both View Changes and View Summary
				icon = '📄';
				buttons = `
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewSnapshot('${it.id}')" title="View the initial file snapshot">View Initial Snapshot</button>
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewChanges('${it.id}')" title="View the changes made">View Changes</button>
					${summary ? `<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewSummary('${it.id}')" title="View AI-generated summary">View Summary</button>` : ''}
				`;
			} else {
				// Other types
				icon = '📄';
				buttons = `
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewSnapshot('${it.id}')" title="View the initial file snapshot">View Initial Snapshot</button>
					<button class="button small" style="background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground);" onclick="viewChanges('${it.id}')" title="View the changes made">View Changes</button>
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
					padding: 16px;
					overflow: auto;
					flex: 1;
					font-family: monospace;
					font-size: 12px;
					white-space: pre-wrap;
					word-break: break-all;
				">${escapeHtml(diffContent)}</div>
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
					<h3 style="margin: 0;">${escapeHtml(title)}</h3>
					<button class="button" onclick="document.getElementById('snapshotModal').remove()">Close</button>
				</div>
				<div style="
					padding: 16px;
					overflow: auto;
					flex: 1;
					font-family: monospace;
					font-size: 12px;
					white-space: pre-wrap;
					word-break: break-all;
				">${escapeHtml(snapshotContent)}</div>
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

		loadProfileData();
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
		if (!message.profile) return;
		
		const profile = message.profile;
		
		const nameInput = document.getElementById('profile-name');
		if (nameInput && profile.name) {
			nameInput.value = profile.name;
		}
		
		if (profile.interests && Array.isArray(profile.interests)) {
			profile.interests.forEach(interest => {
				const checkbox = document.querySelector(`input[name="interests"][value="${interest}"]`);
				if (checkbox) {
					checkbox.checked = true;
				}
			});
			
			const predefinedInterests = ['Java', 'Python', 'TypeScript', 'JavaScript', 'C++', 'C#', 
				'Frontend', 'Backend', 'Database', 'UI/UX', 'DevOps', 'Testing'];
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
			
			const predefinedWeaknesses = ['Java', 'Python', 'TypeScript', 'JavaScript', 'C++', 'C#', 
				'Frontend', 'Backend', 'Database', 'UI/UX', 'DevOps', 'Testing'];
			const customWeaknesses = profile.weaknesses.filter(w => !predefinedWeaknesses.includes(w));
			if (customWeaknesses.length > 0) {
				const customInput = document.getElementById('custom-weaknesses');
				if (customInput) {
					customInput.value = customWeaknesses.join(', ');
				}
			}
		}
	}
})();
