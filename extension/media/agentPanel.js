(function(){
  // Use global vscode if already initialized (when embedded in mainPanel)
  const vscode = window.vscode || acquireVsCodeApi();

  function post(command, payload={}){ 
    console.log('Posting message:', {command, ...payload});
    vscode.postMessage({command, ...payload}); 
  }

  const switchBtn = () => document.getElementById('switchTeamBtn');
  const createBtn = () => document.getElementById('createTeamBtn');
  const joinBtn = () => document.getElementById('joinTeamBtn');
  const refreshBtn = () => document.getElementById('refreshTeamsBtn');
  const copyJoinCodeBtn = () => document.getElementById('copyJoinCodeBtn');
  const deleteBtn = () => document.getElementById('deleteTeamBtn');
  const leaveBtn = () => document.getElementById('leaveTeamBtn');

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

  function initializeButtons() {
    console.log('Initializing Agent Panel buttons');

    // Team Members toggle handler
    const teamMembersHeader = document.getElementById('teamMembersHeader');
    if (teamMembersHeader && !teamMembersHeader.hasAttribute('data-listener-added')) {
      teamMembersHeader.addEventListener('click', window.toggleTeamMembers);
      teamMembersHeader.setAttribute('data-listener-added', 'true');
      console.log('Team Members toggle listener added');
    }

    // Add event listeners with debug logging
    const s = switchBtn();
    if (s && !s.hasAttribute('data-listener-added')) {
      s.addEventListener('click', () => {
        console.log('Switch Team button clicked');
        post('switchTeam');
      });
      s.setAttribute('data-listener-added', 'true');
      console.log('Switch Team button listener added');
    } else if (!s) {
      console.log('Switch Team button not found');
    }
    
    const c = createBtn(); 
    if (c && !c.hasAttribute('data-listener-added')) {
      c.addEventListener('click', () => {
        console.log('Create Team button clicked');
        post('createTeam');
      });
      c.setAttribute('data-listener-added', 'true');
      console.log('Create Team button listener added');
    } else if (!c) {
      console.log('Create Team button not found');
    }
    
    const j = joinBtn(); 
    if (j && !j.hasAttribute('data-listener-added')) {
      j.addEventListener('click', () => {
        console.log('Join Team button clicked');
        post('joinTeam');
      });
      j.setAttribute('data-listener-added', 'true');
      console.log('Join Team button listener added');
    } else if (!j) {
      console.log('Join Team button not found');
    }
    
    const r = refreshBtn(); 
    if (r && !r.hasAttribute('data-listener-added')) {
      r.addEventListener('click', () => {
        console.log('Refresh Teams button clicked');
        post('refreshTeams');
      });
      r.setAttribute('data-listener-added', 'true');
      console.log('Refresh Teams button listener added');
    } else if (!r) {
      console.log('Refresh Teams button not found');
    }
    
    const copy = copyJoinCodeBtn(); 
    if (copy && !copy.hasAttribute('data-listener-added')) {
      copy.addEventListener('click', copyJoinCode);
      copy.setAttribute('data-listener-added', 'true');
      console.log('Copy Join Code button listener added');
    } else if (!copy) {
      console.log('Copy Join Code button not found');
    }

    const d = deleteBtn();
    if (d && !d.hasAttribute('data-listener-added')) {
      d.addEventListener('click', () => {
        console.log('Delete Team button clicked');
        post('deleteTeam');
      });
      d.setAttribute('data-listener-added', 'true');
      console.log('Delete Team button listener added');
    } else if (!d) {
      console.log('Delete Team button not found');
    }

    const l = leaveBtn();
    if (l && !l.hasAttribute('data-listener-added')) {
      l.addEventListener('click', () => {
        console.log('Leave Team button clicked');
        post('leaveTeam');
      });
      l.setAttribute('data-listener-added', 'true');
      console.log('Leave Team button listener added');
    } else if (!l) {
      console.log('Leave Team button not found');
    }

    // Initialize AI chat elements
    const input = document.getElementById('ai-chat-input');
    const send = document.getElementById('ai-chat-send');

    if (send && !send.hasAttribute('data-listener-added')) {
      send.addEventListener('click', sendMessage);
      send.setAttribute('data-listener-added', 'true');
    }
    if (input && !input.hasAttribute('data-listener-added')) {
      input.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });
      input.setAttribute('data-listener-added', 'true');
    }

    // File Snapshot controls
    const genIdBtn = document.getElementById('fs-generateIdBtn');
    const addBtn = document.getElementById('fs-addBtn');
    const genSummaryBtn = document.getElementById('fs-generateSummaryBtn');

    if (genIdBtn && !genIdBtn.hasAttribute('data-listener-added')) {
      genIdBtn.addEventListener('click', () => {
        const idEl = document.getElementById('fs-id');
        if (idEl) idEl.value = cryptoRandomUUIDFallback();
        const upEl = document.getElementById('fs-updatedAt');
        if (upEl) upEl.value = new Date().toISOString();
      });
      genIdBtn.setAttribute('data-listener-added', 'true');
    }

    if (addBtn && !addBtn.hasAttribute('data-listener-added')) {
      addBtn.addEventListener('click', () => {
        const id = (document.getElementById('fs-id')?.value || '').trim() || cryptoRandomUUIDFallback();
        const file_path = (document.getElementById('fs-filePath')?.value || '').trim();
        const snapshot = (document.getElementById('fs-snapshot')?.value || '').trim();
        const changes = (document.getElementById('fs-changes')?.value || '').trim();
        const feedback = document.getElementById('fs-feedback');
        if (!file_path || !snapshot) {
          if (feedback) feedback.textContent = 'Please provide at least File Path and Snapshot text.';
          return;
        }
        const payload = { id, file_path, snapshot, changes, updated_at: new Date().toISOString() };
        post('addFileSnapshot', { payload });
        if (feedback) feedback.textContent = 'Saving snapshot...';
      });
      addBtn.setAttribute('data-listener-added', 'true');
    }

    if (genSummaryBtn && !genSummaryBtn.hasAttribute('data-listener-added')) {
      genSummaryBtn.addEventListener('click', () => {
        const explicit = (document.getElementById('fs-summary-id')?.value || '').trim();
        const current = (document.getElementById('fs-id')?.value || '').trim();
        const snapshot_id = explicit || current;
        const fb = document.getElementById('fs-summary-feedback');
        if (!snapshot_id) {
          if (fb) fb.textContent = 'Please enter or generate a Snapshot ID first.';
          return;
        }
        post('generateSummary', { snapshotId: snapshot_id });
        if (fb) fb.textContent = 'Generating AI summary...';
      });
      genSummaryBtn.setAttribute('data-listener-added', 'true');
    }

    // Add publish snapshot button
    const publishBtn = document.getElementById('publishSnapshotBtn');
    if (publishBtn && !publishBtn.hasAttribute('data-listener-added')) {
      publishBtn.addEventListener('click', () => {
        console.log('Publish Snapshot button clicked');
        post('publishSnapshot');
      });
      publishBtn.setAttribute('data-listener-added', 'true');
      console.log('Publish Snapshot button listener added');
    }
  }

  function sendMessage(){
    const input = document.getElementById('ai-chat-input');
    const text = (input.value||'').trim();
    if(!text) return; 
    appendMessage('You', text);
    post('aiQuery', { text }); 
    input.value='';
  }

  function appendMessage(sender, text){
    const log = document.getElementById('ai-chat-log');
    if (log) {
      const msg = document.createElement('div');
      msg.className = 'chat-message';
      msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
      log.appendChild(msg); 
      log.scrollTop = log.scrollHeight;
    }
  }

  // Try to initialize when DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    initializeButtons();

    // Restore team info from webview state if available
    const previousState = vscode.getState();
    console.log('[agentPanel] Restored state:', previousState);
    if (previousState && previousState.team) {
      console.log('[agentPanel] Restoring team info from state');
      // Update UI with restored state
      const tn = document.getElementById('teamName');
      const tr = document.getElementById('teamRole');
      const tc = document.getElementById('teamJoinCode');
      const jcs = document.getElementById('joinCodeSection');

      if (tn) tn.textContent = previousState.team.name ?? '—';
      if (tr) tr.textContent = previousState.team.role ?? '—';
      if (tc && jcs) {
        if (previousState.team.joinCode && previousState.team.name !== 'No Team') {
          tc.textContent = previousState.team.joinCode;
          jcs.style.display = 'block';
        }
      }
    }

    // Notify extension that webview is ready to receive team info
    console.log('Sending webviewReady message to extension');
    post('webviewReady');
  });

  // Fallback: try to initialize immediately if document is already loaded
  if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded');
  } else {
    console.log('Document already loaded, initializing immediately');
    initializeButtons();

    // Restore team info from webview state if available
    const previousState = vscode.getState();
    console.log('[agentPanel] Restored state (immediate):', previousState);
    if (previousState && previousState.team) {
      console.log('[agentPanel] Restoring team info from state (immediate)');
      const tn = document.getElementById('teamName');
      const tr = document.getElementById('teamRole');
      const tc = document.getElementById('teamJoinCode');
      const jcs = document.getElementById('joinCodeSection');

      if (tn) tn.textContent = previousState.team.name ?? '—';
      if (tr) tr.textContent = previousState.team.role ?? '—';
      if (tc && jcs) {
        if (previousState.team.joinCode && previousState.team.name !== 'No Team') {
          tc.textContent = previousState.team.joinCode;
          jcs.style.display = 'block';
        }
      }
    }

    // Notify extension that webview is ready
    console.log('Sending webviewReady message to extension (immediate)');
    post('webviewReady');
  }

  // Additional fallback: try again after a short delay
  setTimeout(() => {
    console.log('Fallback initialization after 100ms');
    initializeButtons();
  }, 100);

  function copyJoinCode() {
    const joinCodeElement = document.getElementById('teamJoinCode');
    if (joinCodeElement && joinCodeElement.textContent !== '—') {
      navigator.clipboard.writeText(joinCodeElement.textContent).then(() => {
        // Visual feedback for copy action
        const btn = copyJoinCodeBtn();
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = '✓';
          setTimeout(() => {
            btn.textContent = originalText;
          }, 1000);
        }
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = joinCodeElement.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      });
    }
  }

  window.addEventListener('message', (e)=>{
    const m = e.data;
    switch(m.command){
      case 'updateTeamInfo':
        console.log('[agentPanel] Received updateTeamInfo:', m);

        // Save team info to webview state for persistence
        vscode.setState({ team: m.team, userId: m.userId, allTeams: m.allTeams });
        console.log('[agentPanel] Saved team info to webview state');

        const tn = document.getElementById('teamName');
        const tr = document.getElementById('teamRole');
        const tc = document.getElementById('teamJoinCode');
        const jcs = document.getElementById('joinCodeSection');
        const ps = document.getElementById('projectStatus');
        const psi = document.getElementById('projectStatusIndicator');
        const del = deleteBtn();
        const leave = leaveBtn();

        console.log('[agentPanel] DOM elements found:', {
          teamName: !!tn,
          teamRole: !!tr,
          teamJoinCode: !!tc,
          joinCodeSection: !!jcs
        });

        if (tn) {
          console.log('[agentPanel] Setting teamName to:', m.team?.name ?? '—');
          tn.textContent = m.team?.name ?? '—';
        } else {
          console.error('[agentPanel] teamName element NOT FOUND!');
        }

        if (tr) {
          console.log('[agentPanel] Setting teamRole to:', m.team?.role ?? '—');
          tr.textContent = m.team?.role ?? '—';
        } else {
          console.error('[agentPanel] teamRole element NOT FOUND!');
        }
        
        // Show/hide join code section based on whether user has a team
        if (tc && jcs) {
          if (m.team?.joinCode && m.team.name !== 'No Team') {
            tc.textContent = m.team.joinCode;
            jcs.style.display = 'block';
          } else {
            tc.textContent = '—';
            jcs.style.display = 'none';
          }
        }
        
        // Show/hide project validation status
        if (ps && psi) {
          if (m.team?.projectValidation && m.team.name !== 'No Team') {
            const validation = m.team.projectValidation;
            ps.style.display = 'block';
            
            if (validation.isMatch) {
              psi.innerHTML = `<span style="color: var(--vscode-testing-iconPassed);">✅ Project: Correct folder open</span>`;
              psi.title = validation.details;
            } else {
              psi.innerHTML = `<span style="color: var(--vscode-testing-iconFailed);">⚠️ Project: Wrong folder open</span>`;
              psi.title = validation.details;
              psi.style.cursor = 'help';
            }
          } else {
            ps.style.display = 'none';
          }
        }
        // Show delete button only for Admin; show leave button only for Members
        if (del) del.style.display = (m.team?.name && m.team?.role === 'Admin') ? 'inline-block' : 'none';
        if (leave) leave.style.display = (m.team?.name && m.team?.role === 'Member') ? 'inline-block' : 'none';

        // Update Team Members section
        const teamMembersSection = document.getElementById('teamMembersSection');
        const memberCount = document.getElementById('memberCount');
        const membersList = document.getElementById('membersList');

        console.log('[agentPanel] Team Members Debug:', {
          hasSection: !!teamMembersSection,
          hasCount: !!memberCount,
          hasList: !!membersList,
          teamMembers: m.teamMembers,
          teamMembersLength: m.teamMembers?.length,
          teamName: m.team?.name
        });

        if (teamMembersSection && memberCount && membersList) {
          if (m.teamMembers && m.teamMembers.length > 0 && m.team?.name && m.team.name !== 'No Team') {
            console.log('[agentPanel] Showing Team Members section with', m.teamMembers.length, 'members');
            // Show the team members section
            teamMembersSection.style.display = 'block';
            memberCount.textContent = m.teamMembers.length;

            // Clear existing members
            membersList.innerHTML = '';

            // Add each member to the list
            m.teamMembers.forEach(member => {
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

            // Reinitialize toggle handler in case it was lost
            const teamMembersHeader = document.getElementById('teamMembersHeader');
            if (teamMembersHeader && !teamMembersHeader.hasAttribute('data-listener-added')) {
              teamMembersHeader.addEventListener('click', window.toggleTeamMembers);
              teamMembersHeader.setAttribute('data-listener-added', 'true');
            }
          } else {
            // Hide the team members section if no team or no members
            teamMembersSection.style.display = 'none';
          }
        }

        // Pre-fill IDs/time for File Snapshot section
        try {
          const idEl = document.getElementById('fs-id');
          const userEl = document.getElementById('fs-userId');
          const teamEl = document.getElementById('fs-teamId');
          const upEl = document.getElementById('fs-updatedAt');
          if (idEl && !idEl.value) idEl.value = cryptoRandomUUIDFallback();
          if (userEl && m.userId) userEl.value = m.userId;
          if (teamEl && m.team?.id) teamEl.value = m.team.id;
          if (upEl) upEl.value = new Date().toISOString();
        } catch (err) {}
        break;
      case 'aiResponse':
        const log = document.getElementById('ai-chat-log');
        if (log){
          const msg = document.createElement('div');
          msg.className = 'chat-message ai-message';
          msg.textContent = `Agent: ${m.text}`;
          log.appendChild(msg); log.scrollTop = log.scrollHeight;
        }
        break;
      case 'fileSnapshotSaved':
        {
          const fb = document.getElementById('fs-feedback');
          if (fb) fb.textContent = `Snapshot saved (id: ${m.id}).`;
          const summaryId = document.getElementById('fs-summary-id');
          if (summaryId) summaryId.value = m.id;
        }
        break;
      case 'fileSnapshotError':
        {
          const fb = document.getElementById('fs-feedback');
          if (fb) fb.textContent = `Error: ${m.error}`;
        }
        break;
      case 'summaryGenerated':
        {
          const fb = document.getElementById('fs-summary-feedback');
          if (fb) fb.textContent = `Summary stored: ${m.summary}`;
        }
        break;
      case 'summaryError':
        {
          const fb = document.getElementById('fs-summary-feedback');
          if (fb) fb.textContent = `Error: ${m.error}`;
        }
        break;
    }
  });
})();
  function cryptoRandomUUIDFallback(){
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
      const r = Math.random()*16|0, v = c==='x'?r:(r&0x3)|0x8; return v.toString(16);
    });
  }
