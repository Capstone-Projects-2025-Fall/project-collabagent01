(function(){
  const vscode = acquireVsCodeApi();

  function post(command, payload={}){ vscode.postMessage({command, ...payload}); }

  const switchBtn = () => document.getElementById('switchTeamBtn');
  const createBtn = () => document.getElementById('createTeamBtn');
  const joinBtn = () => document.getElementById('joinTeamBtn');
  const refreshBtn = () => document.getElementById('refreshTeamsBtn');
  const copyJoinCodeBtn = () => document.getElementById('copyJoinCodeBtn');

  window.addEventListener('DOMContentLoaded', () => {
    const s = switchBtn(); if (s) s.addEventListener('click', ()=>post('switchTeam'));
    const c = createBtn(); if (c) c.addEventListener('click', ()=>post('createTeam'));
    const j = joinBtn(); if (j) j.addEventListener('click', ()=>post('joinTeam'));
    const r = refreshBtn(); if (r) r.addEventListener('click', ()=>post('refreshTeams'));
    const copy = copyJoinCodeBtn(); if (copy) copy.addEventListener('click', copyJoinCode);

    const input = document.getElementById('ai-chat-input');
    const send = document.getElementById('ai-chat-send');
    const log = document.getElementById('ai-chat-log');

    function appendMessage(sender, text){
      const msg = document.createElement('div');
      msg.className = 'chat-message';
      msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
      log.appendChild(msg); log.scrollTop = log.scrollHeight;
    }

    function sendMessage(){
      const text = (input.value||'').trim();
      if(!text) return; appendMessage('You', text);
      post('aiQuery', { text }); input.value='';
    }

    if (send) send.addEventListener('click', sendMessage);
    if (input) input.addEventListener('keypress', (e)=>{ if(e.key==='Enter') sendMessage(); });
  });

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
})();
