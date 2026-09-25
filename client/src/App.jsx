import { useEffect, useRef, useState } from 'react';
import './App.css';

const initialDiff = `diff --git a/src/App.jsx b/src/App.jsx
index 7d6ae9c..0d869a0 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -10,6 +10,8 @@ export default function App() {
   const [count, setCount] = useState(0);
+  const [loading, setLoading] = useState(false);
 
   return (
     <div className="app-shell">
-      <button onClick={() => setCount(count + 1)}>Add</button>
+      <button onClick={() => setCount((c) => c + 1)}>Add</button>
     </div>
   );
 }`;

export default function App() {
  const [diffText, setDiffText] = useState(initialDiff);
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(null);
  const rateLimitEndTimeRef = useRef(null);

  useEffect(() => {
    if (rateLimitSeconds === null) return undefined;

    const updateRemainingTime = () => {
      const remainingSeconds = Math.max(0, Math.ceil((rateLimitEndTimeRef.current - Date.now()) / 1000));

      if (remainingSeconds === 0) {
        rateLimitEndTimeRef.current = null;
        setRateLimitSeconds(null);
        clearInterval(intervalId);
      } else {
        setRateLimitSeconds(remainingSeconds);
      }
    };

    const intervalId = setInterval(updateRemainingTime, 1000);
    updateRemainingTime();

    return () => clearInterval(intervalId);
  }, [rateLimitSeconds]);

  const handleGenerate = async () => {
    if (!diffText.trim()) {
      setCommitMessage('');
      return;
    }

    setLoading(true);
    setCopied(false);
    setRateLimitSeconds(null);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';
      const url = `${apiBaseUrl}/api/generate-commit-message?diff=${encodeURIComponent(diffText)}`;
      const res = await fetch(url, {
        method: 'GET',
      });

      const rawText = await res.text();
      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(rawText || 'Server returned an invalid response.');
      }

      if (res.status === 429) {
        const retryAfterHeader = Number.parseInt(res.headers.get('Retry-After'), 10);
        const retryAfterSeconds = Number.isFinite(retryAfterHeader)
          ? retryAfterHeader
          : Number(data.retryAfterSeconds) || 12;

        setCommitMessage('');
        const retrySeconds = Math.max(1, retryAfterSeconds);
        rateLimitEndTimeRef.current = Date.now() + retrySeconds * 1000;
        setRateLimitSeconds(retrySeconds);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Gemini request failed.');
      }

      setCommitMessage(data.commitMessage || '');
    } catch (error) {
      setRateLimitSeconds(null);
      setCommitMessage(error.message || 'Gemini request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!commitMessage) return;

    await navigator.clipboard.writeText(commitMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="app-page" style={styles.page}>
      <main className="app-main" style={styles.main}> 
        <section style={styles.editorPanel}>
          <nav className="diffNavbar" aria-label="Clear Committ navigation" style={styles.diffNavbar}>
            <span style={styles.projectName}>Clear Committ</span>
            <span style={styles.diffLabel}>Git diff</span>
          </nav>

          <div style={styles.editorBody}>
            <textarea
              value={diffText}
              onChange={(e) => setDiffText(e.target.value)}
              style={styles.textarea}
              placeholder="Paste git diff output here..."
            />
          </div>

          <div className="actionRow" style={styles.actionRow}>
            <button
              className="generateButton"
              onClick={handleGenerate}
              style={styles.generateButton}
              disabled={loading || rateLimitSeconds > 0}
            >
              {loading ? 'Generating...' : 'Generate commit message'}
            </button>
          </div>

          <div style={styles.outputBox}>
            <div style={styles.outputHeader}>Suggested commit message</div>
            {rateLimitSeconds !== null ? (
              <div className="rateLimitWarning" style={styles.rateLimitWarning} role="alert">
                <div style={styles.rateLimitTitle}>Rate limit exceeded</div>
                <div style={styles.rateLimitText}>
                  Please wait {rateLimitSeconds} second{rateLimitSeconds === 1 ? '' : 's'} before making a new request.
                </div>
              </div>
            ) : (
              <div className="outputMessage" style={styles.outputMessage}>{commitMessage || 'No message generated yet.'}</div>
            )}
            <button onClick={handleCopy} disabled={!commitMessage || rateLimitSeconds !== null} style={styles.copyButton}>
              <span aria-hidden="true">▣</span> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0d1117',
    color: '#e6edf3',
    padding: '22px 30px 48px',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  main: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    maxWidth: '1280px',
    margin: '0 auto',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  fileCard: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '16px',
  },
  fileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  fileTitle: { fontWeight: 600 },
  fileIcon: { color: '#8b949e', marginRight: '4px', fontSize: '13px' },
  statusDot: {
    width: '10px',
    height: '10px',
    background: '#238636',
    borderRadius: '50%',
    display: 'inline-block',
  },
  fileInfo: {
    color: '#8b949e',
    fontSize: '13px',
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  metricBox: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '14px 8px',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: '21px',
    fontWeight: 800,
    marginBottom: '4px',
  },
  metricLabel: {
    color: '#8b949e',
    fontSize: '12px',
  },
  editorPanel: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(1,4,9,0.24)',
  },
  diffNavbar: {
    minHeight: '54px',
    padding: '0 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #30363d',
    background: '#161b22',
  },
  projectName: {
    color: '#f0f6fc',
    fontSize: '17px',
    fontWeight: 800,
    letterSpacing: '0.01em',
  },
  diffLabel: {
    color: '#8b949e',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  editorBody: { padding: '16px 16px 12px' },
  textarea: {
    width: '100%',
    height: '300px',
    resize: 'vertical',
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    color: '#e6edf3',
    padding: '18px',
    fontSize: '13px',
    lineHeight: '1.65',
    outline: 'none',
  },
  actionRow: {
    padding: '0 16px 16px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  generateButton: {
    background: '#238636',
    color: '#fff',
    border: '1px solid rgba(240,246,252,0.1)',
    borderRadius: '6px',
    padding: '9px 16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  outputBox: {
    margin: '0 16px 16px',
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '16px',
  },
  outputHeader: {
    color: '#8b949e',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '12px',
  },
  outputMessage: {
    fontSize: '22px',
    fontWeight: 700,
    marginBottom: '16px',
    wordBreak: 'break-word',
  },
  rateLimitWarning: {
    background: '#3d1f00',
    border: '1px solid #d29922',
    borderRadius: '6px',
    padding: '14px 16px',
    marginBottom: '16px',
  },
  rateLimitTitle: {
    color: '#f2cc60',
    fontSize: '17px',
    fontWeight: 700,
    marginBottom: '5px',
  },
  rateLimitText: {
    color: '#e6edf3',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  copyButton: {
    background: '#21262d',
    color: '#e6edf3',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '7px 12px',
    cursor: 'pointer',
  },
};
