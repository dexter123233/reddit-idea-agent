let windowId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlightPosts' && sender.tab) {
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'highlightPosts',
      results: message.results
    });
  }
  
  if (message.action === 'setOverlay' && sender.tab) {
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'setOverlay',
      enabled: message.enabled
    });
  }
  
  if (message.action === 'downloadFile') {
    const blob = new Blob([message.content], { type: message.type });
    const reader = new FileReader();
    reader.onload = function() {
      chrome.downloads.download({
        url: reader.result,
        filename: message.filename,
        saveAs: true
      });
    };
    reader.readAsDataURL(blob);
  }
  
  if (message.action === 'exportToNotion') {
    const { token, dbId, leads } = message;
    let exported = 0;
    let failed = 0;
    
    function exportLead(index) {
      if (index >= leads.length) {
        sendResponse({ exported, failed });
        return;
      }
      
      const lead = leads[index];
      
      fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          parent: { database_id: dbId },
          properties: {
            'Name': { title: [{ text: { content: lead.title.substring(0, 100) } }] },
            'Subreddit': { rich_text: [{ text: { content: lead.subreddit } }] },
            'URL': { url: lead.url },
            'Score': { number: lead.score },
            'Problem': { rich_text: [{ text: { content: (lead.aiAnalysis && lead.aiAnalysis.core_frustration || '').substring(0, 2000) } }] },
            'Workaround': { rich_text: [{ text: { content: (lead.aiAnalysis && lead.aiAnalysis.workaround || '').substring(0, 2000) } }] },
            'AI Score': { number: (lead.aiAnalysis && lead.aiAnalysis.monetization) || 0 },
            'Status': { select: { name: 'New' } }
          }
        })
      }).then(response => {
        if (response.ok) exported++;
        else failed++;
        setTimeout(() => exportLead(index + 1), 600);
      }).catch(() => {
        failed++;
        setTimeout(() => exportLead(index + 1), 600);
      });
    }
    
    exportLead(0);
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    overlayEnabled: true,
    scanResults: []
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (windowId) {
    try {
      await chrome.windows.update(windowId, { focused: true });
      return;
    } catch (e) {
      windowId = null;
    }
  }
  
  const win = await chrome.windows.create({
    url: 'popup.html',
    type: 'normal',
    width: 450,
    height: 700,
    minWidth: 350,
    minHeight: 400,
    resizable: true,
    top: 100,
    left: 100
  });
  
  windowId = win.id;
  
  chrome.windows.onRemoved.addListener((removedId) => {
    if (removedId === windowId) {
      windowId = null;
    }
  });
});
