const highPatterns = [
  /looking for.*(alternative|replacement|to replace)/i,
  /need.*(software|tool|app|solution)/i,
  /best.*?(alternative|to|for)/i,
  /recommend.*?(software|tool|app)/i,
  /tired of/i,
  /frustrat/i,
  /waste of/i,
  /can't find/i,
  /doesn'?t exist/i,
  /no good/i,
  /sucks/i,
  /horrible/i,
  /better than/i,
  /help me choose/i,
  /should i (use|get|buy)/i,
  /switching from/i,
  /migrat/i,
  /any alternativ/i,
  /doesn'?t work/i,
  /broken/i,
  /fix/i,
  /bug/i,
  /problem.*(with)?/i,
  /issue.*(with)?/i,
  /wrong/i,
  /annoying/i,
  /difficult/i,
  /hard to/i
];

const medPatterns = [
  /how (do|can|to)/i,
  /is there/i,
  /what (is|are|should)/i,
  /suggest/i,
  /advice/i,
  /new to/i,
  /getting started/i,
  /beginner/i,
  /looking to/i,
  /trying to/i,
  /anyone know/i,
  /need help/i,
  /question/i
];

function analyzeIntent(title) {
  const t = title.toLowerCase();
  for (const p of highPatterns) {
    if (p.test(t)) return 'high';
  }
  for (const p of medPatterns) {
    if (p.test(t)) return 'medium';
  }
  return null;
}

function getSortCategory() {
  const url = window.location.pathname;
  if (url.includes('/hot')) return 'hot';
  if (url.includes('/new')) return 'new';
  if (url.includes('/top')) return 'top';
  if (url.includes('/rising')) return 'rising';
  if (url.includes('/best')) return 'best';
  return 'new';
}

function addIntentOverlay() {
  const posts = document.querySelectorAll('[data-testid="post-container"], .Post, .thing, article');
  
  posts.forEach(post => {
    if (post.dataset.painPointScanned) return;
    
    const titleEl = post.querySelector('h3, .title, [data-testid="post-title"], a[data-testid="post-title"]');
    if (!titleEl) return;
    
    const title = titleEl.textContent || titleEl.innerText;
    const intent = analyzeIntent(title);
    
    if (intent) {
      post.dataset.painPointScanned = 'true';
      post.classList.add(`pain-point-${intent}`);
      
      const badge = document.createElement('span');
      badge.className = `pain-intent-badge ${intent}`;
      const cat = getSortCategory();
      badge.textContent = intent === 'high' 
        ? `🔥 HIGH INTENT (${cat.toUpperCase()})` 
        : `🟡 MEDIUM (${cat.toUpperCase()})`;
      
      const target = post.querySelector('a') || post;
      target.parentNode?.insertBefore(badge, target);
    }
  });
}

function removeOverlays() {
  document.querySelectorAll('.pain-intent-badge').forEach(el => el.remove());
  document.querySelectorAll('[data-pain-point-scanned]').forEach(el => {
    el.removeAttribute('data-pain-point-scanned');
    el.classList.remove('pain-point-high', 'pain-point-medium');
  });
}

let overlayEnabled = true;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'highlightPosts') {
    overlayEnabled = true;
    addIntentOverlay();
  } else if (message.action === 'setOverlay') {
    overlayEnabled = message.enabled;
    if (overlayEnabled) {
      addIntentOverlay();
    } else {
      removeOverlays();
    }
  }
});

chrome.storage.local.get('overlayEnabled', (result) => {
  if (result.overlayEnabled === false) {
    overlayEnabled = false;
  } else {
    setTimeout(addIntentOverlay, 2000);
    setTimeout(addIntentOverlay, 5000);
  }
});

const observer = new MutationObserver(() => {
  if (overlayEnabled) {
    addIntentOverlay();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

setTimeout(addIntentOverlay, 1000);
