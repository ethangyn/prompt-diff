const samplePrompts = {
  a: `You are a careful, concise assistant.

Answer the user's question directly and explain your reasoning when it is useful. If you are unsure, say so instead of inventing facts.

Use short paragraphs and Markdown lists when they improve clarity. Ask one focused follow-up question when the request is ambiguous.`,
  b: `You are a helpful, concise assistant.

Answer the user's question directly and explain your reasoning briefly when it is useful. If you are unsure, say so instead of making up facts.

Use short paragraphs and Markdown lists when they improve clarity. Ask one focused follow-up question only when the request is ambiguous.`
};

const MAX_TOKENS = 4000;

const promptA = document.querySelector('#prompt-a');
const promptB = document.querySelector('#prompt-b');
const diffOutput = document.querySelector('#diff-output');
const viewButtons = {
  split: document.querySelector('#view-split'),
  inline: document.querySelector('#view-inline')
};

let view = 'split';

promptA.value = samplePrompts.a;
promptB.value = samplePrompts.b;

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));
}

function tokenize(text) {
  return text.match(/\s+|[\p{L}\p{N}_]+(?:['’][\p{L}\p{N}_]+)?|[^\p{L}\p{N}_\s]/gu) || [];
}

function wordCount(text) {
  return (text.match(/[\p{L}\p{N}_]+(?:['’][\p{L}\p{N}_]+)?/gu) || []).length;
}

function statsFor(text) {
  const words = wordCount(text);
  return {
    chars: text.length,
    words,
    tokens: Math.round(words * 1.3)
  };
}

function signedDelta(value) {
  if (value === 0) return 'No change';
  return `${value > 0 ? '+' : ''}${value} vs A`;
}

function updateStat(id, value) {
  document.querySelector(`#${id}`).textContent = value.toLocaleString();
}

function updateStats(a, b) {
  const statsA = statsFor(a);
  const statsB = statsFor(b);
  ['chars', 'words', 'tokens'].forEach((key) => {
    updateStat(`${key}-a`, statsA[key]);
    updateStat(`${key}-b`, statsB[key]);
    const delta = document.querySelector(`#${key}-delta`);
    delta.textContent = signedDelta(statsB[key] - statsA[key]);
    delta.classList.toggle('positive', statsB[key] > statsA[key]);
    delta.classList.toggle('negative', statsB[key] < statsA[key]);
  });
}

// A compact LCS diff keeps whitespace visible, so line breaks and spacing are meaningful too.
function diffTokens(oldTokens, newTokens) {
  const rows = oldTokens.length + 1;
  const cols = newTokens.length + 1;
  const table = Array.from({ length: rows }, () => new Uint32Array(cols));

  for (let i = oldTokens.length - 1; i >= 0; i -= 1) {
    for (let j = newTokens.length - 1; j >= 0; j -= 1) {
      table[i][j] = oldTokens[i] === newTokens[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const result = [];
  let i = 0;
  let j = 0;
  while (i < oldTokens.length || j < newTokens.length) {
    if (i < oldTokens.length && j < newTokens.length && oldTokens[i] === newTokens[j]) {
      result.push({ type: 'same', value: oldTokens[i] });
      i += 1;
      j += 1;
    } else if (j < newTokens.length && (i === oldTokens.length || table[i][j + 1] > table[i + 1][j])) {
      result.push({ type: 'added', value: newTokens[j] });
      j += 1;
    } else {
      result.push({ type: 'removed', value: oldTokens[i] });
      i += 1;
    }
  }
  return result;
}

function renderOps(ops, side) {
  return ops.map(({ type, value }) => {
    if (side === 'left' && type === 'added') return '';
    if (side === 'right' && type === 'removed') return '';
    const safeValue = escapeHtml(value);
    if (type === 'same') return safeValue;
    return `<mark class="diff-${type}">${safeValue}</mark>`;
  }).join('');
}

function lineRows(a, b) {
  const ops = diffTokens(a.split('\n'), b.split('\n'));
  const rows = [];
  let index = 0;
  while (index < ops.length) {
    if (ops[index].type === 'same') {
      rows.push({ left: ops[index].value, right: ops[index].value });
      index += 1;
      continue;
    }
    const removed = [];
    const added = [];
    while (index < ops.length && ops[index].type !== 'same') {
      if (ops[index].type === 'removed') removed.push(ops[index].value);
      else added.push(ops[index].value);
      index += 1;
    }
    const count = Math.max(removed.length, added.length);
    for (let pair = 0; pair < count; pair += 1) {
      rows.push({
        left: pair < removed.length ? removed[pair] : undefined,
        right: pair < added.length ? added[pair] : undefined
      });
    }
  }
  return rows;
}

function markedLine(line, type) {
  const text = line === '' ? ' ' : escapeHtml(line);
  return `<mark class="diff-${type}">${text}</mark>`;
}

function renderPaired(left, right) {
  if (left === undefined) {
    return { left: '', right: markedLine(right, 'added') };
  }
  if (right === undefined) {
    return { left: markedLine(left, 'removed'), right: '' };
  }
  if (left === right) {
    const html = escapeHtml(left);
    return { left: html, right: html };
  }
  const oldTokens = tokenize(left);
  const newTokens = tokenize(right);
  if (oldTokens.length > MAX_TOKENS || newTokens.length > MAX_TOKENS) {
    return { left: markedLine(left, 'removed'), right: markedLine(right, 'added') };
  }
  const ops = diffTokens(oldTokens, newTokens);
  return { left: renderOps(ops, 'left'), right: renderOps(ops, 'right') };
}

function renderSplit(a, b) {
  const lines = lineRows(a, b).map(({ left, right }) => {
    const paired = renderPaired(left, right);
    const leftClass = left !== undefined && left !== right ? ' has-removed' : '';
    const rightClass = right !== undefined && left !== right ? ' has-added' : '';
    return `<div class="diff-line side-a${leftClass}">${paired.left}</div><div class="diff-line side-b${rightClass}">${paired.right}</div>`;
  }).join('');
  return `<div class="diff-colhead">Prompt A</div><div class="diff-colhead">Prompt B</div>${lines}`;
}

function renderInline(a, b) {
  const oldTokens = tokenize(a);
  const newTokens = tokenize(b);
  if (oldTokens.length > MAX_TOKENS || newTokens.length > MAX_TOKENS) {
    const ops = diffTokens(a.split('\n'), b.split('\n'));
    return ops.map((op, index) => {
      const suffix = index === ops.length - 1 ? '' : '\n';
      const text = escapeHtml(op.value);
      if (op.type === 'same') return text + suffix;
      return `<mark class="diff-${op.type}">${text || ' '}</mark>${suffix}`;
    }).join('');
  }
  return renderOps(diffTokens(oldTokens, newTokens), 'inline');
}

function renderMatch(text) {
  const note = '<p class="match-note">No differences. These prompts match.</p>';
  if (view === 'inline') return note + escapeHtml(text);
  const lines = text.split('\n').map((line) => {
    const html = escapeHtml(line);
    return `<div class="diff-line side-a">${html}</div><div class="diff-line side-b">${html}</div>`;
  }).join('');
  return `${note}<div class="diff-colhead">Prompt A</div><div class="diff-colhead">Prompt B</div>${lines}`;
}

function renderDiff(a, b) {
  if (!a && !b) {
    diffOutput.classList.remove('is-split');
    diffOutput.innerHTML = '<div class="empty-state"><span aria-hidden="true">✦</span><p>Start typing in either prompt to see the diff.</p></div>';
    return;
  }

  const split = view === 'split';
  diffOutput.classList.toggle('is-split', split);
  if (a === b) {
    diffOutput.innerHTML = renderMatch(a);
    return;
  }
  diffOutput.innerHTML = split ? renderSplit(a, b) : renderInline(a, b);
}

function update() {
  const a = promptA.value;
  const b = promptB.value;
  updateStats(a, b);
  renderDiff(a, b);
}

function setView(next) {
  view = next;
  viewButtons.split.setAttribute('aria-pressed', String(next === 'split'));
  viewButtons.inline.setAttribute('aria-pressed', String(next === 'inline'));
  update();
}

[promptA, promptB].forEach((textarea) => textarea.addEventListener('input', update));
document.querySelectorAll('[data-clear]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector(`#${button.dataset.clear}`).value = '';
    update();
    document.querySelector(`#${button.dataset.clear}`).focus();
  });
});

document.querySelector('#reset-button').addEventListener('click', () => {
  promptA.value = samplePrompts.a;
  promptB.value = samplePrompts.b;
  update();
});

viewButtons.split.addEventListener('click', () => setView('split'));
viewButtons.inline.addEventListener('click', () => setView('inline'));

update();
