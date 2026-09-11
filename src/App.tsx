import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  TriangleAlert,
  Wrench,
} from 'lucide-react'

type FormState = {
  learning: string
  goal: string
  error: string
  attempts: string
  code: string
}

type FieldKey = keyof FormState

const emptyForm: FormState = {
  learning: '',
  goal: '',
  error: '',
  attempts: '',
  code: '',
}

const exampleForm: FormState = {
  learning: 'JavaScriptのDOM操作を勉強しています',
  goal: 'ボタンを押したら、見出しの文字を「こんにちは」に変えたいです',
  error: 'コンソールに「Cannot set properties of null」と表示されます',
  attempts: 'idのスペルを確認し、scriptタグの位置をbodyの最後に移しました',
  code: `const button = document.getElementById('changeButton');\nconst title = document.getElementById('title');\n\nbutton.addEventListener('click', () => {\n  title.textContent = 'こんにちは';\n});`,
}

const fieldDefinitions: Array<{
  key: FieldKey
  number: string
  title: string
  hint: string
  placeholder: string
  icon: typeof BookOpen
  rows: number
}> = [
  {
    key: 'learning',
    number: '01',
    title: '勉強している内容',
    hint: '言語やツール、いま学んでいるテーマ',
    placeholder: '例：JavaScriptのDOM操作を勉強しています',
    icon: BookOpen,
    rows: 2,
  },
  {
    key: 'goal',
    number: '02',
    title: '実現したいこと',
    hint: '本来どう動いてほしいか',
    placeholder: '例：ボタンを押したら見出しの文字を変えたいです',
    icon: Target,
    rows: 2,
  },
  {
    key: 'error',
    number: '03',
    title: '発生したエラー',
    hint: '表示された文を、そのまま貼り付けてOK',
    placeholder: '例：Cannot set properties of null と表示されます',
    icon: TriangleAlert,
    rows: 2,
  },
  {
    key: 'attempts',
    number: '04',
    title: '試したこと',
    hint: '調べたこと、変更してみたこと',
    placeholder: '例：idのスペルを確認し、scriptタグの位置を変えました',
    icon: Wrench,
    rows: 2,
  },
  {
    key: 'code',
    number: '05',
    title: '自分のコード',
    hint: '関係しそうな部分だけでも大丈夫です',
    placeholder: "const button = document.getElementById('changeButton');",
    icon: Code2,
    rows: 6,
  },
]

const sentences: Record<Exclude<FieldKey, 'code'>, (value: string) => string> = {
  learning: (value) => value.replace(/[。.]$/, '') + '。',
  goal: (value) => '実現したいことは、' + value.replace(/[。.]$/, '') + '。',
  error: (value) => '現在、' + value.replace(/[。.]$/, '') + '。',
  attempts: (value) => 'これまでに、' + value.replace(/[。.]$/, '') + '。',
}

function makePrompt(form: FormState) {
  const parts = (Object.keys(sentences) as Array<Exclude<FieldKey, 'code'>>)
    .filter((key) => form[key].trim())
    .map((key) => sentences[key](form[key].trim()))

  if (form.code.trim()) {
    parts.push(`コードはこちらです。\n\n\`\`\`\n${form.code.trim()}\n\`\`\``)
  }

  if (parts.length === 0) {
    return '左の項目を入力すると、ここに質問文が表示されます。'
  }

  return `${parts.join('\n\n')}\n\nプログラミング初心者にも分かるように、原因と確認手順を教えてください。`
}

function App() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [copied, setCopied] = useState(false)
  const [isCodeOpen, setIsCodeOpen] = useState(true)
  const textareaRefs = useRef<Partial<Record<FieldKey, HTMLTextAreaElement>>>({})

  const completed = Object.values(form).filter((value) => value.trim()).length
  const prompt = useMemo(() => makePrompt(form), [form])

  useEffect(() => {
    Object.values(textareaRefs.current).forEach((textarea) => {
      if (!textarea) return
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    })
  }, [form, isCodeOpen])

  const updateField = (key: FieldKey, value: string) => {
    setForm((current) => ({ ...current, [key]: value }))
    setCopied(false)
  }

  const copyPrompt = async () => {
    if (completed === 0) return
    try {
      await navigator.clipboard.writeText(prompt)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = prompt
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2400)
  }

  const reset = () => {
    setForm(emptyForm)
    setCopied(false)
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="KIKUMON ホーム">
          <span className="brand-mark" aria-hidden="true"><Sparkles size={18} strokeWidth={1.8} /></span>
          <span>KIKUMON</span>
        </a>
        <p className="brand-subtitle">質問文メーカー</p>
        <a className="how-link" href="#how-to-use">使い方 <span aria-hidden="true">↗</span></a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-eyebrow"><span /> ASK WITH CLARITY</div>
          <h1 id="page-title">困りごとを、<br /><em>伝わる質問</em>に。</h1>
          <p>いくつかの項目を埋めるだけ。<br className="mobile-only" />ChatGPTにそのまま貼れる質問文をつくります。</p>
        </section>

        <section className="workspace" aria-label="質問文作成フォーム">
          <div className="form-panel">
            <div className="panel-heading">
              <div>
                <span className="section-label">YOUR SITUATION</span>
                <h2>状況を教えてください</h2>
              </div>
              <div className="progress" aria-label={`${completed}/5 項目入力済み`}>
                <strong>{String(completed).padStart(2, '0')}</strong><span>/ 05</span>
              </div>
            </div>

            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${(completed / 5) * 100}%` }} />
            </div>

            <div className="fields">
              {fieldDefinitions.map((field) => {
                const Icon = field.icon
                const isCode = field.key === 'code'
                if (isCode && !isCodeOpen) {
                  return (
                    <button className="collapsed-field" type="button" key={field.key} onClick={() => setIsCodeOpen(true)}>
                      <span className="field-icon"><Icon size={17} /></span>
                      <span><b>{field.title}</b><small>任意・クリックして入力</small></span>
                      <ChevronDown size={18} />
                    </button>
                  )
                }
                return (
                  <div className={`field-group ${isCode ? 'code-field' : ''}`} key={field.key}>
                    <label htmlFor={field.key}>
                      <span className="field-number">{field.number}</span>
                      <span className="field-icon"><Icon size={17} /></span>
                      <span className="field-copy"><b>{field.title}{isCode && <small className="optional">任意</small>}</b><small>{field.hint}</small></span>
                      {isCode && (
                        <button className="collapse-button" type="button" aria-label="コード欄を閉じる" onClick={() => setIsCodeOpen(false)}>
                          <ChevronDown size={18} />
                        </button>
                      )}
                    </label>
                    <textarea
                      id={field.key}
                      ref={(element) => {
                        if (element) textareaRefs.current[field.key] = element
                      }}
                      value={form[field.key]}
                      placeholder={field.placeholder}
                      rows={field.rows}
                      spellCheck={!isCode}
                      onChange={(event) => updateField(field.key, event.target.value)}
                    />
                  </div>
                )
              })}
            </div>

            <div className="form-actions">
              <button type="button" className="text-button" onClick={() => setForm(exampleForm)}>
                <Lightbulb size={16} /> 入力例を入れる
              </button>
              <button type="button" className="text-button" onClick={reset} disabled={completed === 0}>
                <RotateCcw size={15} /> リセット
              </button>
            </div>
          </div>

          <aside className="preview-panel" aria-live="polite">
            <div className="preview-heading">
              <div>
                <span className="section-label">READY TO COPY</span>
                <h2>できあがった質問文</h2>
              </div>
              <span className="live-badge"><i /> LIVE</span>
            </div>

            <div className={`prompt-paper ${completed === 0 ? 'empty' : ''}`}>
              <div className="quote-mark" aria-hidden="true">“</div>
              <pre>{prompt}</pre>
              <div className="paper-corner" aria-hidden="true" />
            </div>

            <button className={`copy-button ${copied ? 'copied' : ''}`} type="button" onClick={copyPrompt} disabled={completed === 0}>
              <span className="copy-icon">{copied ? <Check size={20} /> : <Clipboard size={20} />}</span>
              <span>{copied ? 'コピーしました' : '質問文をコピーする'}</span>
              <span className="shortcut">{copied ? 'READY!' : '⌘ C'}</span>
            </button>
            <p className="privacy-note"><span aria-hidden="true">●</span> 入力内容は保存・送信されません</p>
          </aside>
        </section>

        <section className="how-section" id="how-to-use">
          <span className="section-label">3 SIMPLE STEPS</span>
          <h2>使い方は、とても簡単。</h2>
          <div className="steps">
            <article><span>1</span><h3>状況を入力</h3><p>分かる範囲だけで<br />大丈夫です。</p></article>
            <div className="step-line" />
            <article><span>2</span><h3>質問文をコピー</h3><p>内容は入力と同時に<br />整えられます。</p></article>
            <div className="step-line" />
            <article><span>3</span><h3>ChatGPTへ</h3><p>そのまま貼り付けて<br />質問しましょう。</p></article>
          </div>
        </section>
      </main>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><Sparkles size={15} /></span><span>KIKUMON</span></div>
        <p>いい質問が、学びを前に進める。</p>
        <small>© 2026 KIKUMON</small>
      </footer>
    </div>
  )
}

export default App
