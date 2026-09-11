const targets = await fetch('http://127.0.0.1:9222/json/list').then((response) => response.json())
const page = targets.find((target) => target.type === 'page' && target.url.includes('127.0.0.1:5173'))

if (!page) throw new Error('App page was not found')

const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let id = 0
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
})

const send = (method, params = {}) => new Promise((resolve, reject) => {
  id += 1
  pending.set(id, { resolve, reject })
  socket.send(JSON.stringify({ id, method, params }))
})

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

await evaluate(`new Promise((resolve) => {
  const button = document.querySelector('.example-button');
  button.click();
  setTimeout(resolve, 150);
})`)

const populated = await evaluate(`(() => ({
  progress: document.querySelector('.progress').innerText.replace(/\\s/g, ''),
  prompt: document.querySelector('.prompt-paper pre').innerText,
  saved: JSON.parse(localStorage.getItem('kikumon-question-draft-v1')),
}))()`)

if (populated.progress !== '05/05') throw new Error(`Unexpected progress: ${populated.progress}`)
if (!populated.prompt.includes('JavaScriptのDOM操作を勉強しています')) throw new Error('Prompt was not generated')
if (!populated.prompt.includes('質問の目的：エラーを解決')) throw new Error('Selected template was not reflected')
if (!populated.saved?.form?.code) throw new Error('Draft was not saved to localStorage')

await evaluate(`new Promise((resolve) => {
  document.querySelector('.copy-button').click();
  setTimeout(resolve, 150);
})`)

const copiedLabel = await evaluate(`document.querySelector('.copy-button').innerText`)
if (!copiedLabel.includes('コピーしました')) throw new Error('Copy confirmation was not shown')

await evaluate(`new Promise((resolve) => {
  document.querySelector('.reset-button').click();
  setTimeout(resolve, 150);
})`)

const resetState = await evaluate(`(() => ({
  progress: document.querySelector('.progress').innerText.replace(/\\s/g, ''),
  values: [...document.querySelectorAll('textarea')].map((item) => item.value),
  resetDisabled: document.querySelector('.reset-button').disabled,
}))()`)

if (resetState.progress !== '00/05') throw new Error(`Unexpected reset progress: ${resetState.progress}`)
if (resetState.values.some(Boolean)) throw new Error('Reset should clear every field')
if (!resetState.resetDisabled) throw new Error('Reset button should be disabled after clearing')

const storageAfterReset = await evaluate(`localStorage.getItem('kikumon-question-draft-v1')`)
if (storageAfterReset !== null) throw new Error('Saved draft should be removed after reset')

const errors = await evaluate(`window.__uiCheckErrors || []`)
if (errors.length) throw new Error(errors.join('\n'))

console.log('UI check passed: example → prompt generation → copy confirmation → reset')
socket.close()
