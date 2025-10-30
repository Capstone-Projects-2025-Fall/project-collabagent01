(function(){
  const vscode = acquireVsCodeApi();

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

  function initializeButtons() {
    console.log('Initializing Agent Panel buttons');
    
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
  });

  // Fallback: try to initialize immediately if document is already loaded
  if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded');
  } else {
    console.log('Document already loaded, initializing immediately');
    initializeButtons();
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
        const tn = document.getElementById('teamName');
        const tr = document.getElementById('teamRole');
        const tc = document.getElementById('teamJoinCode');
        const jcs = document.getElementById('joinCodeSection');
        const ps = document.getElementById('projectStatus');
        const psi = document.getElementById('projectStatusIndicator');
        const del = deleteBtn();
  const leave = leaveBtn();
        
        if (tn) tn.textContent = m.team?.name ?? '—';
        if (tr) tr.textContent = m.team?.role ?? '—';
        
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
    }
  });
      document.addEventListener("DOMContentLoaded", () => {
        const vscode = acquireVsCodeApi();

        const publishBtn = document.getElementById("publishSnapshotBtn");
        if (publishBtn) {
            publishBtn.addEventListener("click", () => {
                vscode.postMessage({ command: "publishSnapshot" });
            });
        }
    });
})();
