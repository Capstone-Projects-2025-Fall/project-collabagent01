(function(){
  const vscode = acquireVsCodeApi();

  function post(command, payload={}){ vscode.postMessage({command, ...payload}); }

  const switchBtn = () => document.getElementById('switchTeamBtn');
  const createBtn = () => document.getElementById('createTeamBtn');
  const joinBtn = () => document.getElementById('joinTeamBtn');

  window.addEventListener('DOMContentLoaded', () => {
    const s = switchBtn(); if (s) s.addEventListener('click', ()=>post('switchTeam'));
    const c = createBtn(); if (c) c.addEventListener('click', ()=>post('createTeam'));
    const j = joinBtn(); if (j) j.addEventListener('click', ()=>post('joinTeam'));

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

  window.addEventListener('message', (e)=>{
    const m = e.data;
    switch(m.command){
      case 'updateTeamInfo':
        const tn = document.getElementById('teamName');
        const tr = document.getElementById('teamRole');
        if (tn) tn.textContent = m.team?.name ?? '—';
        if (tr) tr.textContent = m.team?.role ?? '—';
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
