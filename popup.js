// Pain Point Scanner - Clean Version

var TIMEOUT_MS = 25000;
var results = [];
var userMetrics = {};
var filterSub = null;
var scanInterval = null;
var settings = {};
var serverOnline = false;

var RATE_LIMIT = { requests: 0, resetTime: Date.now() + 60000 };

function checkServerStatus() {
  var dot = document.getElementById('serverDot');
  var text = document.getElementById('serverText');
  var startBtn = document.getElementById('startServerBtn');
  
  fetch('http://localhost:3002/health', { method: 'GET', mode: 'no-cors' })
    .then(function() {
      serverOnline = true;
      dot.className = 'dot online';
      text.textContent = 'Server online - Ready';
      if (startBtn) startBtn.style.display = 'none';
    })
    .catch(function() {
      serverOnline = false;
      dot.className = 'dot offline';
      text.textContent = 'Server offline';
      if (startBtn) startBtn.style.display = 'block';
    });
}

function rateLimitedFetch(url, options) {
  if (Date.now() > RATE_LIMIT.resetTime) {
    RATE_LIMIT.requests = 0;
    RATE_LIMIT.resetTime = Date.now() + 60000;
  }
  if (RATE_LIMIT.requests >= 55) {
    return new Promise(function(resolve) {
      setTimeout(function() { resolve(rateLimitedFetch(url, options)); }, 1000);
    });
  }
  RATE_LIMIT.requests++;
  var headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' };
  if (options && options.headers) {
    Object.keys(options.headers).forEach(function(k) { headers[k] = options.headers[k]; });
  }
  return fetch(url, { method: options ? options.method : 'GET', headers: headers });
}

function analyzeIntent(title, body) {
  var text = (title + ' ' + (body || '')).toLowerCase();
  var highPatterns = ['looking for alternative', 'need software', 'best alternative', 'recommend tool', 'tired of', 'frustrated', 'broken', "doesn't work", 'any tool for', 'is there a tool'];
  var toolPatterns = ['is there a tool for', 'any tool that', 'can someone recommend', 'looking for a app', 'need a software', 'manual workaround', 'using spreadsheet for'];
  var i;
  for (i = 0; i < highPatterns.length; i++) {
    if (text.indexOf(highPatterns[i].toLowerCase()) !== -1) return 'high';
  }
  for (i = 0; i < toolPatterns.length; i++) {
    if (text.indexOf(toolPatterns[i].toLowerCase()) !== -1) return 'medium';
  }
  return null;
}

function fetchSubreddit(sub, sort, limit) {
  var url = 'https://www.reddit.com/r/' + sub + '/' + sort + '.json?limit=' + limit;
  return rateLimitedFetch(url).then(function(response) {
    if (!response.ok) return Promise.resolve([]);
    return response.json().then(function(data) {
      return data.data.children.map(function(post) {
        var p = post.data;
        return {
          title: p.title,
          body: p.selftext || '',
          subreddit: sub,
          sort: sort,
          score: p.score,
          url: 'https://reddit.com' + p.permalink,
          id: p.id,
          created_utc: p.created_utc,
          author: p.author,
          num_comments: p.num_comments,
          intent: analyzeIntent(p.title, p.selftext)
        };
      }).filter(function(p) { return p.intent; });
    });
  });
}

function fetchUserInfo(username) {
  if (userMetrics[username]) return Promise.resolve(userMetrics[username]);
  return rateLimitedFetch('https://www.reddit.com/user/' + username + '/about.json').then(function(response) {
    var info = { username: username, url: 'https://reddit.com/u/' + username, created_date: 'N/A', account_age_days: 0, is_premium: false, is_gold: false, karma: 0 };
    if (response.ok) {
      return response.json().then(function(data) {
        var u = data.data;
        var created = new Date(u.created_utc * 1000);
        var age = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
        info = { username: username, url: 'https://reddit.com/u/' + username, created_date: created.toLocaleDateString(), account_age_days: age, is_premium: u.is_premium, is_gold: u.is_gold, karma: (u.link_karma || 0) + (u.comment_karma || 0) };
        userMetrics[username] = info;
        return info;
      }).catch(function() { userMetrics[username] = info; return info; });
    }
    userMetrics[username] = info;
    return info;
  }).catch(function() { userMetrics[username] = info; return info; });
}

function analyzeWithAI(post) {
  var apiKey = settings.openrouterKey;
  if (!apiKey) {
    return Promise.resolve({ core_frustration: 'AI not configured', workaround: 'N/A', monetization: 5, skip: false });
  }
  var model = settings.aiModel || 'google/gemini-2.0-flash-001';
  var prompt = 'Analyze this Reddit post. Extract: 1) THE PROBLEM 2) CURRENT WORKAROUND 3) MONETIZATION SCORE 1-10. Format: PROBLEM: xxx WORKAROUND: xxx SCORE: x DECISION: KEEP or SKIP\n\nPost: ' + post.title.substring(0, 200);
  
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://pain-point-scanner.github.io',
      'X-Title': 'Pain Point Scanner'
    },
    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: prompt }], max_tokens: 200 })
  }).then(function(response) {
    if (!response.ok) return Promise.resolve({ core_frustration: 'API Error', workaround: 'N/A', monetization: 5, skip: false });
    return response.json();
  }).then(function(data) {
    var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    var analysis = { core_frustration: text, workaround: 'N/A', monetization: 5, skip: false };
    var problemMatch = text.match(/PROBLEM:\s*(.+)/i);
    var workaroundMatch = text.match(/WORKAROUND:\s*(.+)/i);
    var scoreMatch = text.match(/SCORE:\s*(\d+)/i);
    var decisionMatch = text.match(/DECISION:\s*(SKIP|KEEP)/i);
    if (problemMatch) analysis.core_frustration = problemMatch[1].trim();
    if (workaroundMatch) analysis.workaround = workaroundMatch[1].trim();
    if (scoreMatch) analysis.monetization = parseInt(scoreMatch[1], 10);
    if (decisionMatch) analysis.skip = decisionMatch[1].toUpperCase() === 'SKIP';
    return analysis;
  }).catch(function(e) {
    return { core_frustration: 'Error: ' + e.message, workaround: 'N/A', monetization: 5, skip: false };
  });
}

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scan() {
  var input = document.getElementById('subreddits').value;
  var subreddits = input.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
  var btn = document.getElementById('scanBtn');
  var status = document.getElementById('status');
  var useAI = document.getElementById('aiToggle').checked;
  
  if (!subreddits.length) {
    status.textContent = 'Enter subreddits';
    status.className = 'status error';
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Scanning...';
  status.textContent = 'Starting...';
  status.className = 'status scanning';
  
  results = [];
  userMetrics = {};
  var startTime = Date.now();
  var aiAnalyzed = 0;
  var sorts = ['rising', 'new', 'hot'];
  
  function scanNext() {
    if (Date.now() - startTime >= TIMEOUT_MS) {
      finishScan(aiAnalyzed);
      return;
    }
    
    var sub = subreddits.shift();
    if (!sub) {
      finishScan(aiAnalyzed);
      return;
    }
    
    var sort = sorts.shift();
    if (!sort) { sorts = ['rising', 'new', 'hot']; sort = sorts.shift(); }
    
    status.textContent = 'Scanning r/' + sub + '...';
    
    fetchSubreddit(sub, sort, 15).then(function(posts) {
      var promises = posts.map(function(post) {
        return fetchUserInfo(post.author).then(function(userInfo) {
          var item = Object.assign({}, post, {
            user_url: userInfo.url,
            user_created_date: userInfo.created_date,
            user_account_age_days: userInfo.account_age_days,
            user_is_premium: userInfo.is_premium,
            user_is_gold: userInfo.is_gold,
            user_karma: userInfo.karma,
            scanned_at: new Date().toISOString()
          });
          
          if (useAI && post.intent === 'high' && aiAnalyzed < (settings.maxAiPosts || 10)) {
            status.textContent = 'AI analyzing...';
            return analyzeWithAI(post).then(function(analysis) {
              aiAnalyzed++;
              item.aiAnalysis = analysis;
              if (analysis.skip) return null;
              return item;
            });
          }
          return item;
        });
      });
      
      Promise.all(promises).then(function(items) {
        items.forEach(function(item) {
          if (item) results.push(item);
        });
        
        setTimeout(scanNext, 500);
      });
    }).catch(function(e) {
      console.error(e);
      setTimeout(scanNext, 500);
    });
  }
  
  function finishScan(aiCount) {
    results.sort(function(a, b) {
      var scoreA = (a.aiAnalysis && a.aiAnalysis.monetization) || (a.intent === 'high' ? 10 : 5);
      var scoreB = (b.aiAnalysis && b.aiAnalysis.monetization) || (b.intent === 'high' ? 10 : 5);
      return scoreB - scoreA;
    });
    
    saveData();
    updateUI();
    
    var highCount = results.filter(function(r) { return r.intent === 'high'; }).length;
    status.textContent = 'Found ' + results.length + ' (' + highCount + ' high, ' + aiCount + ' AI)';
    status.className = 'status success';
    btn.disabled = false;
    btn.textContent = 'Start Scan';
    
    if (results.length > 0 && settings.discordWebhook) {
      sendDiscord(results.filter(function(r) { return r.intent === 'high'; }));
    }
  }
  
  scanNext();
}

function saveData() {
  chrome.storage.local.set({ scanData: { results: results, userMetrics: userMetrics, settings: settings, lastScan: new Date().toISOString() } });
}

function loadData() {
  chrome.storage.local.get(['scanData'], function(result) {
    if (result.scanData) {
      results = result.scanData.results || [];
      userMetrics = result.scanData.userMetrics || {};
      settings = result.scanData.settings || {};
      
      document.getElementById('openrouterKey').value = settings.openrouterKey || '';
      document.getElementById('discordWebhook').value = settings.discordWebhook || '';
      document.getElementById('slackWebhook').value = settings.slackWebhook || '';
      document.getElementById('notionToken').value = settings.notionToken || '';
      document.getElementById('notionDbId').value = settings.notionDbId || '';
      document.getElementById('aiModel').value = settings.aiModel || 'google/gemini-2.0-flash-001';
      document.getElementById('maxAiPosts').value = settings.maxAiPosts || 10;
      
      if (settings.subreddits) {
        document.getElementById('subreddits').value = settings.subreddits;
      }
      
      updateUI();
    }
    checkServerStatus();
    
    // Check server status periodically
    setInterval(checkServerStatus, 30000);
  });
}

function updateUI() {
  var high = results.filter(function(r) { return r.intent === 'high'; });
  var medium = results.filter(function(r) { return r.intent === 'medium'; });
  var aiCount = results.filter(function(r) { return r.aiAnalysis; }).length;
  
  document.getElementById('highCount').textContent = high.length;
  document.getElementById('mediumCount').textContent = medium.length;
  document.getElementById('totalCount').textContent = results.length;
  document.getElementById('aiCount').textContent = aiCount;
  document.getElementById('totalLeads').textContent = results.length;
  
  updateHighlights();
  displayResults();
}

function updateHighlights() {
  var panel = document.getElementById('highlights');
  var subCounts = {};
  results.forEach(function(r) { subCounts[r.subreddit] = (subCounts[r.subreddit] || 0) + 1; });
  var topSubs = Object.keys(subCounts).sort(function(a, b) { return subCounts[b] - subCounts[a]; }).slice(0, 6);
  
  if (topSubs.length) {
    panel.style.display = 'flex';
    panel.innerHTML = topSubs.map(function(sub) {
      return '<div class="highlight-item' + (filterSub === sub ? ' active' : '') + '" data-sub="' + sub + '">r/' + sub + '</div>';
    }).join('');
    
    panel.querySelectorAll('.highlight-item').forEach(function(el) {
      el.addEventListener('click', function() {
        filterSub = filterSub === this.dataset.sub ? null : this.dataset.sub;
        updateHighlights();
        displayResults();
      });
    });
  } else {
    panel.style.display = 'none';
  }
}

function displayResults() {
  var container = document.getElementById('results');
  var filtered = filterSub ? results.filter(function(r) { return r.subreddit === filterSub; }) : results;
  
  if (!filtered.length) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#818384">No results</div>';
    return;
  }
  
  container.innerHTML = filtered.slice(0, 15).map(function(post) {
    var aiHtml = post.aiAnalysis ? '<div class="analysis"><strong>AI:</strong> ' + escapeHtml(post.aiAnalysis.core_frustration || '') + ' (Score: ' + (post.aiAnalysis.monetization || 'N/A') + '/10)</div>' : '';
    return '<div class="result-card ' + post.intent + '"><div class="meta"><span class="sub">r/' + post.subreddit + '</span> ' + post.sort + ' ' + post.score + ' pts</div><div class="title">' + escapeHtml(post.title) + '</div><div class="user-info">u/' + post.author + ' ' + post.user_karma + ' karma ' + (post.user_is_premium ? '★' : '') + '</div>' + aiHtml + '<a href="' + post.url + '" target="_blank" style="color:#0079D3;font-size:11px">View →</a></div>';
  }).join('');
}

function sendDiscord(leads) {
  if (!settings.discordWebhook || !leads.length) return;
  
  fetch(settings.discordWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: 'New Pain Points Found',
        description: 'Found ' + leads.length + ' opportunities',
        color: 16744448,
        fields: leads.slice(0, 5).map(function(l) { return { name: 'r/' + l.subreddit, value: l.title.substring(0, 100) + '\n[View](' + l.url + ')' }; })
      }]
    })
  }).catch(function(e) { console.error('Discord error', e); });
}

function downloadFile(content, filename, type) {
  var blob = new Blob([content], { type: type });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  if (!results.length) return alert('No results');
  var headers = ['subreddit', 'title', 'url', 'score', 'intent', 'author', 'ai_analysis', 'scored_at'];
  var rows = results.map(function(r) {
    return headers.map(function(h) {
      var val = h === 'ai_analysis' ? (r.aiAnalysis && r.aiAnalysis.core_frustration) || '' : r[h] || '';
      return '"' + String(val).replace(/"/g, '""') + '"';
    }).join(',');
  });
  downloadFile([headers.join(','), '\n', rows.join('\n')], 'pain_points.csv', 'text/csv');
}

function exportJSON() {
  if (!results.length) return alert('No results');
  downloadFile(JSON.stringify({ exported_at: new Date().toISOString(), results: results }, null, 2), 'pain_points.json', 'application/json');
}

function exportExcel() {
  if (!results.length) return alert('No results');
  var html = '<html><head><meta charset="utf-8"></head><body><table border="1"><tr style="background:#FF4500;color:white"><th>Sub</th><th>Title</th><th>URL</th><th>Score</th><th>AI Analysis</th></tr>';
  html += results.map(function(r) {
    return '<tr><td>' + r.subreddit + '</td><td>' + r.title.replace(/</g, '&lt;') + '</td><td>' + r.url + '</td><td>' + r.score + '</td><td>' + (r.aiAnalysis && r.aiAnalysis.core_frustration || '') + '</td></tr>';
  }).join('');
  html += '</table></body></html>';
  downloadFile(html, 'pain_points.xls', 'application/vnd.ms-excel');
}

function exportSheets() {
  if (!results.length) return alert('No results');
  var tsv = 'Subreddit\tTitle\tURL\tScore\tIntent\tAI Analysis\n';
  tsv += results.map(function(r) {
    return [r.subreddit, r.title, r.url, r.score, r.intent, (r.aiAnalysis && r.aiAnalysis.core_frustration) || ''].join('\t');
  }).join('\n');
  downloadFile(tsv, 'pain_points.tsv', 'text/tab-separated-values');
}

function exportNotion() {
  var notionToken = settings.notionToken;
  var notionDbId = settings.notionDbId;
  
  if (!notionToken || !notionDbId) {
    alert('Configure Notion in Settings first.\n\nSteps:\n1. Go to notion.so/my-integrations\n2. Create new integration\n3. Copy the secret token\n4. Create a database and share with integration\n5. Copy database ID from URL');
    return;
  }
  
  var highLeads = results.filter(function(r) { 
    return r.intent === 'high' && r.aiAnalysis && r.aiAnalysis.core_frustration && !r.aiAnalysis.core_frustration.includes('AI not configured') && !r.aiAnalysis.core_frustration.includes('API Error');
  });
  if (!highLeads.length) {
    alert('No AI-analyzed high intent leads. Run scan with AI enabled first.');
    return;
  }
  
  var btn = document.getElementById('exportNotion');
  btn.textContent = 'Exporting...';
  btn.disabled = true;
  
  var exported = 0;
  var failed = 0;
  
  function exportNext() {
    if (exported + failed >= highLeads.length) {
      btn.textContent = 'Export to Notion';
      btn.disabled = false;
      if (failed > 0) {
        alert('Exported: ' + exported + '\nFailed: ' + failed);
      } else {
        alert('Successfully exported ' + exported + ' leads to Notion!');
      }
      return;
    }
    
    var lead = highLeads[exported + failed];
    
    fetch('http://localhost:3002/api/notion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: notionToken,
        dbId: notionDbId,
        title: lead.title,
        subreddit: lead.subreddit,
        url: lead.url,
        score: lead.score,
        problem: lead.aiAnalysis && lead.aiAnalysis.core_frustration,
        workaround: lead.aiAnalysis && lead.aiAnalysis.workaround,
        aiScore: lead.aiAnalysis && lead.aiAnalysis.monetization
      })
    }).then(function(response) {
      return response.json().then(function(data) {
        if (response.ok) {
          exported++;
        } else {
          console.error('Notion export error:', data);
          alert('Notion error: ' + (data.message || JSON.stringify(data)));
          failed++;
        }
        setTimeout(exportNext, 500);
      });
    }).catch(function(e) {
      console.error('Network error:', e);
      alert('Network error: ' + e.message);
      failed++;
      setTimeout(exportNext, 500);
    });
  }
  
  exportNext();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  
  // Start Server button
  document.getElementById('startServerBtn').addEventListener('click', function() {
    var btn = this;
    btn.textContent = 'Starting...';
    btn.disabled = true;
    
    fetch('http://localhost:3002/', { method: 'HEAD', mode: 'no-cors' })
      .then(function() {
        checkServerStatus();
      })
      .catch(function() {
        btn.textContent = 'Run: node server.js';
        btn.disabled = false;
        alert('Please start the server manually:\n1. Open terminal\n2. Navigate to extension folder\n3. Run: node server.js\n\nOr use launch.sh script');
      });
  });
  
  // Tabs
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });
  
  // Quick tags
  document.querySelectorAll('.quick-tag').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.getElementById('subreddits').value = this.dataset.subs;
    });
  });
  
  // Schedule
  document.querySelectorAll('.schedule-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.schedule-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      var interval = parseInt(this.dataset.interval, 10);
      if (scanInterval) { clearInterval(scanInterval); scanInterval = null; }
      if (interval > 0) { scanInterval = setInterval(scan, interval * 60 * 1000); }
    });
  });
  
  // Scan
  document.getElementById('scanBtn').addEventListener('click', scan);
  
  // Save settings
  document.getElementById('saveSettings').addEventListener('click', function() {
    settings = {
      openrouterKey: document.getElementById('openrouterKey').value,
      discordWebhook: document.getElementById('discordWebhook').value,
      slackWebhook: document.getElementById('slackWebhook').value,
      notionToken: document.getElementById('notionToken').value,
      notionDbId: document.getElementById('notionDbId').value,
      aiModel: document.getElementById('aiModel').value,
      maxAiPosts: parseInt(document.getElementById('maxAiPosts').value, 10),
      subreddits: document.getElementById('subreddits').value
    };
    saveData();
    alert('Settings saved!');
  });
  
  // Export
  document.getElementById('exportCsv').addEventListener('click', exportCSV);
  document.getElementById('exportJson').addEventListener('click', exportJSON);
  document.getElementById('exportExcel').addEventListener('click', exportExcel);
  document.getElementById('exportSheets').addEventListener('click', exportSheets);
  document.getElementById('exportNotion').addEventListener('click', exportNotion);
  
  // Clear
  document.getElementById('clearData').addEventListener('click', function() {
    if (confirm('Clear all data?')) {
      results = [];
      userMetrics = {};
      saveData();
      updateUI();
    }
  });
  
  // Test AI
  document.getElementById('testAI').addEventListener('click', function() {
    var testPost = { title: 'Is there a tool for automating Shopify inventory? I hate manual spreadsheets!', body: 'Using Excel, need help' };
    analyzeWithAI(testPost).then(function(result) {
      alert('AI Result:\n' + JSON.stringify(result, null, 2));
    });
  });
  
  // Load
  loadData();
});
