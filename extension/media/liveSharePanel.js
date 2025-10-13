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
				updateTeamInfo(message.team);
				break;
		}
	});

	function updateTeamInfo(team) {
		console.log('Updating team info:', team);
		
		const teamName = document.getElementById('teamName');
		const teamRole = document.getElementById('teamRole');
		const teamJoinCode = document.getElementById('teamJoinCode');
		const joinCodeSection = document.getElementById('joinCodeSection');
		
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
		}
	}

	function appendAIMessage(text) {
		const chatLog = document.getElementById('ai-chat-log');
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

	// AI Agent Chat UI
	const input = document.getElementById('ai-chat-input');
	const sendBtn = document.getElementById('ai-chat-send');
	const log = document.getElementById('ai-chat-log');

	function appendMessage(sender, text) {
		const msg = document.createElement('div');
		msg.className = 'chat-message';
		msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
		log.appendChild(msg);
		log.scrollTop = log.scrollHeight;
	}

	function sendMessage() {
		const text = input.value.trim();
		if (!text) return;
		appendMessage('You', text);
		vscode.postMessage({ command: 'aiQuery', text });
		input.value = '';
	}

	sendBtn.addEventListener('click', sendMessage);
	input.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') sendMessage();
	});
})();
