async function askAI(question) {
  const resolvedApiKey = await loadApiKey();
  if (!resolvedApiKey) {
    removeTyping();
    const reason = apiKeyLoadError ? ` Grund: ${apiKeyLoadError}` : '';
    addMessage('ai', `API-Schluessel fehlt. Bitte trage deinen Groq API-Key in api-key.txt ein.${reason}`);
    return;
  }

  showTyping();
  const fieldCtx = activeField ? `
Aktuell fokussiertes Feld: "${activeField}"` : '';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resolvedApiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + fieldCtx },
          { role: 'user', content: question }
        ],
        max_tokens: 400
      })
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    removeTyping();
    if (!res.ok) {
      const errorText = data?.error?.message || `HTTP ${res.status}`;
      addMessage('ai', `Fehler vom API-Dienst: ${errorText}`);
      return;
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer === 'string' && answer.trim()) {
      addMessage('ai', answer);
    } else {
      addMessage('ai', 'Fehler: ' + (data?.error?.message || 'Unbekannter Fehler.'));
    }
  } catch (e) {
    removeTyping();
    addMessage('ai', 'Verbindungsfehler. Bitte Internetverbindung pruefen.');
  }
}