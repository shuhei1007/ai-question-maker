import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Bug,
  Camera,
  Check,
  ChevronDown,
  CircleAlert,
  Clipboard,
  Code2,
  FileCode2,
  GraduationCap,
  Lightbulb,
  MessageCircleQuestion,
  RotateCcw,
  Sparkles,
  Target,
  TriangleAlert,
  WandSparkles,
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
type TemplateKey = 'debug' | 'explain' | 'improve' | 'learn'
type CopyStatus = 'idle' | 'success' | 'error'
type SaveStatus = 'idle' | 'saved' | 'error'

const STORAGE_KEY = 'kikumon-question-draft-v1'
const FEEDBACK_FORM_URL = import.meta.env.VITE_FEEDBACK_FORM_URL?.trim()
  || 'https://forms.gle/x7LW7Mkpqso79owGA'
const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL?.trim()
  || 'https://www.instagram.com/shuhei_mikeiken_eng/'
const INSTAGRAM_HANDLE = import.meta.env.VITE_INSTAGRAM_HANDLE?.trim()
  || 'しゅうへい│携帯店員からWebエンジニア'

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

const fieldLimits: Record<FieldKey, number> = {
  learning: 300,
  goal: 500,
  error: 1000,
  attempts: 500,
  code: 8000,
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
    key: 'learning', number: '01', title: '勉強している内容',
    hint: '言語やツール、いま学んでいるテーマ',
    placeholder: '例：JavaScriptのDOM操作を勉強しています', icon: BookOpen, rows: 2,
  },
  {
    key: 'goal', number: '02', title: '実現したいこと', hint: '本来どう動いてほしいか',
    placeholder: '例：ボタンを押したら見出しの文字を変えたいです', icon: Target, rows: 2,
  },
  {
    key: 'error', number: '03', title: '発生したエラー',
    hint: '表示された文を、そのまま貼り付けてOK',
    placeholder: '例：Cannot set properties of null と表示されます', icon: TriangleAlert, rows: 2,
  },
  {
    key: 'attempts', number: '04', title: '試したこと', hint: '調べたこと、変更してみたこと',
    placeholder: '例：idのスペルを確認し、scriptタグの位置を変えました', icon: Wrench, rows: 2,
  },
  {
    key: 'code', number: '05', title: '自分のコード', hint: '関係しそうな部分だけでも大丈夫です',
    placeholder: "const button = document.getElementById('changeButton');", icon: Code2, rows: 6,
  },
]

const templateDefinitions: Array<{
  key: TemplateKey
  title: string
  detail: string
  icon: typeof Bug
  request: string
}> = [
  {
    key: 'debug', title: 'エラーを解決', detail: '原因と直し方を知りたい', icon: Bug,
    request: 'エラーの原因を特定し、初心者にも分かる言葉で確認手順と修正方法を教えてください。',
  },
  {
    key: 'explain', title: 'コードを解説', detail: '処理の流れを理解したい', icon: FileCode2,
    request: 'コードが何をしているか、処理の流れを初心者にも分かるように順番に解説してください。',
  },
  {
    key: 'improve', title: 'コードを改善', detail: 'よりよい書き方を知りたい', icon: WandSparkles,
    request: 'コードをレビューし、改善できる点とその理由を示したうえで、改善後のコードを提案してください。',
  },
  {
    key: 'learn', title: '練習問題を作る', detail: '手を動かして身につけたい', icon: GraduationCap,
    request: 'この内容を練習できる、初心者向けの小さな課題を3問作ってください。各問題にヒントも付けてください。',
  },
]

const requiredFieldsByTemplate: Record<TemplateKey, FieldKey[]> = {
  debug: ['learning', 'goal', 'error'],
  explain: ['learning', 'code'],
  improve: ['learning', 'goal', 'code'],
  learn: ['learning', 'goal'],
}

const sentences: Record<Exclude<FieldKey, 'code'>, (value: string) => string> = {
  learning: (value) => value.replace(/[。.]$/, '') + '。',
  goal: (value) => '実現したいことは、' + value.replace(/[。.]$/, '') + '。',
  error: (value) => '現在、' + value.replace(/[。.]$/, '') + '。',
  attempts: (value) => 'これまでに、' + value.replace(/[。.]$/, '') + '。',
}

function makePrompt(form: FormState, template: TemplateKey) {
  const selectedTemplate = templateDefinitions.find((item) => item.key === template) ?? templateDefinitions[0]
  const parts = (Object.keys(sentences) as Array<Exclude<FieldKey, 'code'>>)
    .filter((key) => form[key].trim())
    .map((key) => sentences[key](form[key].trim()))

  if (form.code.trim()) {
    parts.push(`コードはこちらです。\n\n\`\`\`\n${form.code.trim()}\n\`\`\``)
  }

  if (parts.length === 0) return '左の項目を入力すると、ここに質問文が表示されます。'

  return `【質問の目的：${selectedTemplate.title}】\n\n${parts.join('\n\n')}\n\n${selectedTemplate.request}`
}

function loadStoredState(): { form: FormState; template: TemplateKey } {
  const fallback = { form: emptyForm, template: 'debug' as TemplateKey }
  try {
    if (typeof window === 'undefined') return fallback
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return fallback
    const parsed = JSON.parse(stored) as { form?: Partial<FormState>; template?: unknown }
    const form = { ...emptyForm }
    ;(Object.keys(form) as FieldKey[]).forEach((key) => {
      const value = parsed.form?.[key]
      if (typeof value === 'string') form[key] = value.slice(0, fieldLimits[key])
    })
    const template = templateDefinitions.some((item) => item.key === parsed.template)
      ? parsed.template as TemplateKey
      : fallback.template
    return { form, template }
  } catch {
    return fallback
  }
}

const initialStoredState = loadStoredState()

function App() {
  const [form, setForm] = useState<FormState>(initialStoredState.form)
  const [template, setTemplate] = useState<TemplateKey>(initialStoredState.template)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    Object.values(initialStoredState.form).some((value) => value.trim()) ? 'saved' : 'idle',
  )
  const [isCodeOpen, setIsCodeOpen] = useState(true)
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({})
  const [hasTriedCopy, setHasTriedCopy] = useState(false)
  const textareaRefs = useRef<Partial<Record<FieldKey, HTMLTextAreaElement>>>({})
  const copyTimerRef = useRef<number | undefined>(undefined)

  const completed = Object.values(form).filter((value) => value.trim()).length
  const requiredFields = requiredFieldsByTemplate[template]
  const prompt = useMemo(() => makePrompt(form, template), [form, template])
  const validationErrors = useMemo(() => {
    const errors: Partial<Record<FieldKey, string>> = {}
    fieldDefinitions.forEach((field) => {
      const value = form[field.key]
      if (requiredFields.includes(field.key) && !value.trim()) {
        errors[field.key] = 'この項目は必須です。空白以外の内容を入力してください。'
      } else if (value.length > fieldLimits[field.key]) {
        errors[field.key] = `${fieldLimits[field.key].toLocaleString()}文字以内で入力してください。`
      }
    })
    return errors
  }, [form, requiredFields])

  useEffect(() => {
    Object.entries(textareaRefs.current).forEach(([key, textarea]) => {
      if (!textarea) return
      const maxHeight = key === 'code' ? 320 : 170
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
    })
  }, [form, isCodeOpen])

  useEffect(() => () => {
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
  }, [])

  const clearCopyStatusLater = () => {
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => setCopyStatus('idle'), 2800)
  }

  const persistDraft = (nextForm: FormState, nextTemplate: TemplateKey) => {
    try {
      if (Object.values(nextForm).every((value) => !value.trim())) {
        window.localStorage.removeItem(STORAGE_KEY)
        setSaveStatus('idle')
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ form: nextForm, template: nextTemplate }))
        setSaveStatus('saved')
      }
    } catch {
      setSaveStatus('error')
    }
  }

  const updateField = (key: FieldKey, value: string) => {
    const nextValue = value.trim().length === 0 && value.length > 0 ? '' : value
    const nextForm = { ...form, [key]: nextValue }
    setForm(nextForm)
    persistDraft(nextForm, template)
    setCopyStatus('idle')
  }

  const normalizeField = (key: FieldKey) => {
    setTouched((current) => ({ ...current, [key]: true }))
    const value = form[key]
    const normalized = value.trim() ? (key === 'code' ? value.trimEnd() : value.trim()) : ''
    if (value !== normalized) {
      const nextForm = { ...form, [key]: normalized }
      setForm(nextForm)
      persistDraft(nextForm, template)
    }
  }

  const selectTemplate = (key: TemplateKey) => {
    setTemplate(key)
    persistDraft(form, key)
    setCopyStatus('idle')
    setHasTriedCopy(false)
  }

  const copyPrompt = async () => {
    setHasTriedCopy(true)
    const firstErrorKey = fieldDefinitions.find((field) => validationErrors[field.key])?.key
    if (firstErrorKey) {
      setTouched((current) => ({ ...current, ...Object.fromEntries(requiredFields.map((key) => [key, true])) }))
      if (firstErrorKey === 'code') setIsCodeOpen(true)
      window.requestAnimationFrame(() => textareaRefs.current[firstErrorKey]?.focus())
      return
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = prompt
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        const copied = document.execCommand('copy')
        textArea.remove()
        if (!copied) throw new Error('Copy command failed')
      }
      setCopyStatus('success')
    } catch {
      setCopyStatus('error')
    }
    clearCopyStatusLater()
  }

  const setExample = () => {
    setForm(exampleForm)
    setTemplate('debug')
    persistDraft(exampleForm, 'debug')
    setIsCodeOpen(true)
    setTouched({})
    setHasTriedCopy(false)
    setCopyStatus('idle')
  }

  const reset = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setForm(emptyForm)
    setTouched({})
    setHasTriedCopy(false)
    setCopyStatus('idle')
    setSaveStatus('idle')
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
              <div><span className="section-label">YOUR SITUATION</span><h2>状況を教えてください</h2></div>
              <div className="progress" aria-label={`${completed}/5 項目入力済み`}>
                <strong>{String(completed).padStart(2, '0')}</strong><span>/ 05</span>
              </div>
            </div>

            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${(completed / 5) * 100}%` }} />
            </div>

            <section className="template-section" aria-labelledby="template-title">
              <div className="template-heading">
                <div><span className="section-label">QUESTION TYPE</span><h3 id="template-title">質問の目的を選ぶ</h3></div>
                <span className="required-guide"><i /> 必須項目は目的に合わせて変わります</span>
              </div>
              <div className="template-options" role="radiogroup" aria-label="質問の目的">
                {templateDefinitions.map((item) => {
                  const Icon = item.icon
                  const selected = template === item.key
                  return (
                    <button type="button" className={`template-option ${selected ? 'selected' : ''}`}
                      role="radio" aria-checked={selected} key={item.key} onClick={() => selectTemplate(item.key)}>
                      <span className="template-icon" aria-hidden="true"><Icon size={18} /></span>
                      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                      <i className="radio-mark" aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="fields">
              {fieldDefinitions.map((field) => {
                const Icon = field.icon
                const isCode = field.key === 'code'
                const isRequired = requiredFields.includes(field.key)
                const fieldError = validationErrors[field.key]
                const showError = Boolean(fieldError && (touched[field.key] || hasTriedCopy))
                const remaining = fieldLimits[field.key] - form[field.key].length
                const nearLimit = remaining <= fieldLimits[field.key] * 0.1

                if (isCode && !isCodeOpen) {
                  return (
                    <button className="collapsed-field" type="button" key={field.key} onClick={() => setIsCodeOpen(true)}>
                      <span className="field-icon"><Icon size={17} /></span>
                      <span><b>{field.title}</b><small>{isRequired ? '必須・クリックして入力' : '任意・クリックして入力'}</small></span>
                      <ChevronDown size={18} />
                    </button>
                  )
                }

                return (
                  <div className={`field-group ${isCode ? 'code-field' : ''}`} key={field.key}>
                    <label htmlFor={field.key}>
                      <span className="field-number">{field.number}</span>
                      <span className="field-icon"><Icon size={17} /></span>
                      <span className="field-copy">
                        <b>{field.title}<small className={isRequired ? 'required' : 'optional'}>{isRequired ? '必須' : '任意'}</small></b>
                        <small>{field.hint}</small>
                      </span>
                      {isCode && (
                        <button className="collapse-button" type="button" aria-label="コード欄を閉じる" onClick={() => setIsCodeOpen(false)}>
                          <ChevronDown size={18} />
                        </button>
                      )}
                    </label>
                    <textarea id={field.key}
                      ref={(element) => { if (element) textareaRefs.current[field.key] = element }}
                      value={form[field.key]} placeholder={field.placeholder} rows={field.rows}
                      maxLength={fieldLimits[field.key]} required={isRequired} aria-invalid={showError}
                      aria-describedby={showError ? `${field.key}-error` : `${field.key}-count`}
                      spellCheck={!isCode} onChange={(event) => updateField(field.key, event.target.value)}
                      onBlur={() => normalizeField(field.key)}
                    />
                    <div className="field-meta">
                      <span className="field-error" id={`${field.key}-error`} role={showError ? 'alert' : undefined}>
                        {showError ? <><CircleAlert size={13} /> {fieldError}</> : null}
                      </span>
                      <span className={`character-count ${nearLimit ? 'near-limit' : ''}`} id={`${field.key}-count`}>
                        残り {remaining.toLocaleString()} 文字
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="form-actions" aria-label="入力内容の操作">
              <button type="button" className="form-action-button example-button" onClick={setExample}>
                <span className="form-action-icon" aria-hidden="true"><Lightbulb size={20} /></span>
                <span className="form-action-copy"><strong>入力例をセット</strong><small>5項目すべてに例文を入れます</small></span>
              </button>
              <button type="button" className="form-action-button reset-button" onClick={reset} disabled={completed === 0}>
                <span className="form-action-icon" aria-hidden="true"><RotateCcw size={19} /></span>
                <span className="form-action-copy"><strong>入力内容をすべて削除</strong><small>保存した下書きも消去します</small></span>
              </button>
            </div>
            <p className={`save-status ${saveStatus}`} aria-live="polite">
              {saveStatus === 'saved' && <><Check size={14} /> このブラウザに下書きを自動保存しました</>}
              {saveStatus === 'error' && <><CircleAlert size={14} /> 下書きを保存できませんでした</>}
            </p>
          </div>

          <aside className="preview-panel" aria-live="polite">
            <div className="preview-heading">
              <div><span className="section-label">READY TO COPY</span><h2>できあがった質問文</h2></div>
              <span className="live-badge"><i /> LIVE</span>
            </div>

            <div className={`prompt-paper ${completed === 0 ? 'empty' : ''}`}>
              <div className="quote-mark" aria-hidden="true">“</div>
              <pre>{prompt}</pre>
              <div className="paper-corner" aria-hidden="true" />
            </div>

            {hasTriedCopy && Object.keys(validationErrors).length > 0 && (
              <p className="validation-summary" role="alert">
                <CircleAlert size={16} /> 必須項目を入力してからコピーしてください
              </p>
            )}

            <button className={`copy-button ${copyStatus}`} type="button" onClick={copyPrompt}>
              <span className="copy-icon">
                {copyStatus === 'success' ? <Check size={20} /> : copyStatus === 'error' ? <CircleAlert size={20} /> : <Clipboard size={20} />}
              </span>
              <span>{copyStatus === 'success' ? 'コピーしました！' : copyStatus === 'error' ? 'コピーできませんでした' : '質問文をコピーする'}</span>
              <span className="shortcut">{copyStatus === 'success' ? 'READY!' : '⌘ C'}</span>
            </button>
            <p className={`copy-feedback ${copyStatus}`} role={copyStatus === 'error' ? 'alert' : 'status'}>
              {copyStatus === 'success' && 'ChatGPTにそのまま貼り付けられます'}
              {copyStatus === 'error' && 'ブラウザの許可を確認するか、質問文を選択してコピーしてください'}
            </p>
            <p className="privacy-note"><span aria-hidden="true">●</span> 入力内容はこのブラウザ内だけに一時保存されます</p>
          </aside>
        </section>

        <section className="how-section" id="how-to-use">
          <span className="section-label">3 SIMPLE STEPS</span>
          <h2>使い方は、とても簡単。</h2>
          <div className="steps">
            <article><span>1</span><h3>目的と状況を入力</h3><p>必須マークの項目を<br />入力します。</p></article>
            <div className="step-line" />
            <article><span>2</span><h3>質問文をコピー</h3><p>目的に合った質問文へ<br />自動で整えられます。</p></article>
            <div className="step-line" />
            <article><span>3</span><h3>ChatGPTへ</h3><p>そのまま貼り付けて<br />質問しましょう。</p></article>
          </div>
        </section>

        <section className="connect-section" aria-labelledby="connect-title">
          <div className="connect-heading">
            <span className="section-label">KEEP LEARNING</span>
            <h2 id="connect-title">もっと使いやすく、学びやすく。</h2>
          </div>
          <div className="connect-cards">
            <article className="connect-card feedback-card">
              <span className="connect-icon" aria-hidden="true"><MessageCircleQuestion size={24} /></span>
              <div><p className="connect-kicker">FEEDBACK</p><h3>使いにくかった点を教えてください</h3><p>いただいた声を、KIKUMONの改善に活かします。</p></div>
              {FEEDBACK_FORM_URL ? (
                <a className="connect-button" href={FEEDBACK_FORM_URL} target="_blank" rel="noreferrer">Googleフォームを開く <span>↗</span></a>
              ) : <span className="connect-button disabled" aria-disabled="true">フォームURL準備中</span>}
            </article>

            <article className="connect-card instagram-card">
              <span className="connect-icon" aria-hidden="true"><Camera size={24} /></span>
              <div>
                <p className="connect-kicker">INSTAGRAM</p><h3>未経験向けの学習方法を発信中</h3>
                <p className="account-name"><strong>{INSTAGRAM_HANDLE}</strong></p>
              </div>
              {INSTAGRAM_URL ? (
                <a className="connect-button" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">プロフィールを見る <span>↗</span></a>
              ) : <span className="connect-button disabled" aria-disabled="true">プロフィールURL準備中</span>}
            </article>
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
