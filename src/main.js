import './style.css'
import image1 from '../image_1.webp'
import image2 from '../image_2.webp'
import image3 from '../image_3.webp'
import image4 from '../image_4.webp'
import image5 from '../image_5.webp'
import bannerImage from '../image1111.png'
import { InsufficientStockError, KujiBox, Prize } from './kujiEngine.js'

const MACHINES = [
  { id: 'machine-1', title: 'Vending machine 01', image: image1, accent: '#ff6b9a', glow: '#ffbfda' },
  { id: 'machine-2', title: 'Vending machine 02', image: image2, accent: '#8b6cff', glow: '#d2c8ff' },
  { id: 'machine-3', title: 'Vending machine 03', image: image3, accent: '#00bda8', glow: '#9af4e8' },
  { id: 'machine-4', title: 'Vending machine 04', image: image4, accent: '#ff9d43', glow: '#ffdb9e' },
  { id: 'machine-5', title: 'Vending machine 05', image: image5, accent: '#55a8ff', glow: '#bee0ff' },
]

const DRAW_COUNTS = [1, 5, 10]
const GRADE_COLORS = Object.freeze({ 1: '#ffd23f', 2: '#b565f5', 3: '#4d9bff', 4: '#4ade80' })

const box = new KujiBox({
  title: '캐릭터 드링크 쿠지',
  prizes: [
    new Prize({ grade: 1, name: '1등 · 스페셜 굿즈', total: 1, glow: GRADE_COLORS[1] }),
    new Prize({ grade: 2, name: '2등 · 프리미엄 굿즈', total: 3, glow: GRADE_COLORS[2] }),
    new Prize({ grade: 3, name: '3등 · 컬렉션 굿즈', total: 6, glow: GRADE_COLORS[3] }),
    new Prize({ grade: 4, name: '4등 · 베이직 굿즈', total: 10, glow: GRADE_COLORS[4] }),
  ],
})

const state = {
  machine: null,
  drawCount: 1,
  phase: 'select', // select | ready | brewing | dropping | reveal
  results: [],
  droppedCount: 0,
  revealed: new Set(),
  notice: '',
  timers: [],
}

const app = document.querySelector('#app')

function clearTimers() {
  state.timers.forEach((timer) => window.clearTimeout(timer))
  state.timers = []
}

function normalizeDrawCount() {
  if (state.drawCount <= box.totalRemaining) return
  state.drawCount = DRAW_COUNTS.filter((count) => count <= box.totalRemaining).at(-1) ?? 1
}

function schedule(callback, delay) {
  const timer = window.setTimeout(() => {
    state.timers = state.timers.filter((item) => item !== timer)
    callback()
  }, delay)
  state.timers.push(timer)
}

function stockRows() {
  return box.status()
    .map(
      (prize) => `
        <li class="stock-row">
          <span class="stock-grade grade-${prize.grade}">${prize.grade}등</span>
          <span class="stock-name">${prize.name.split(' · ')[1]}</span>
          <strong>${prize.remaining}<small> / ${prize.total}</small></strong>
          <span class="stock-probability">${prize.probability}%</span>
        </li>`,
    )
    .join('')
}

function machineCard(machine) {
  const isSelected = state.machine?.id === machine.id
  return `
    <button class="machine-card${isSelected ? ' is-selected' : ''}" type="button"
      data-select-machine="${machine.id}" style="--accent:${machine.accent};--machine-glow:${machine.glow}">
      <span class="machine-card__title">${machine.title}</span>
      <span class="machine-card__screen"><img src="${machine.image}" alt="${machine.title} 테마 이미지" /></span>
      <span class="machine-card__bin" aria-hidden="true"><i></i><i></i></span>
      <span class="machine-card__select">선택하기 <b aria-hidden="true">→</b></span>
    </button>`
}

function renderHome() {
  const total = box.totalRemaining
  return `
    <main class="page-shell">
      <header class="site-header">
        <a class="wordmark" href="#top" aria-label="Character Drink Vending Kuji 홈">POTION<span>KUJI</span></a>
        <p>CHARACTER DRINK VENDING MACHINE</p>
        <span class="prototype-badge">UX PROTOTYPE</span>
      </header>

      <section class="hero-banner" id="top" aria-label="캐릭터 드링크 자판기 쿠지 배너">
        <img class="hero-banner__image" src="${bannerImage}" alt="캐릭터 드링크 자판기 배너 이미지" />
        <div class="hero-banner__shade"></div>
        <div class="hero-banner__content">
          <p class="eyebrow">CHARACTER DRINK VENDING KUJI</p>
          <h1>CHOOSE YOUR<br /><em>CHARACTER.</em></h1>
          <p>원하는 캐릭터를 고르고 레버를 당겨<br />오늘의 음료를 획득하세요.</p>
        </div>
        <span class="hero-banner__note">ALL MACHINES · ONE PRIZE BOX</span>
      </section>

      <section class="dashboard" aria-label="쿠지 잔여 재고">
        <div class="remaining-total"><span>남은 음료</span><strong>${total}</strong><small>잔</small></div>
        <ul class="stock-list">${stockRows()}</ul>
      </section>

      <section class="selection" aria-labelledby="selection-heading">
        <div class="section-heading">
          <div><p class="eyebrow">STEP 01</p><h2 id="selection-heading">자판기를 선택하세요</h2></div>
          <p>최대 5대 · 선택 후 모달에서 플레이</p>
        </div>
        <div class="machine-grid">${MACHINES.map(machineCard).join('')}</div>
      </section>
    </main>
    ${state.machine ? renderModal() : ''}`
}

function drawCountControls() {
  const remaining = box.totalRemaining
  return DRAW_COUNTS.map((count) => {
    const disabled = count > remaining || state.phase !== 'ready'
    return `<button type="button" class="draw-count${count === state.drawCount ? ' is-selected' : ''}"
      data-draw-count="${count}" ${disabled ? 'disabled' : ''} aria-pressed="${count === state.drawCount}">${count}연</button>`
  }).join('')
}

function drinkMarkup(result, index) {
  const visible = index < state.droppedCount
  const revealed = state.revealed.has(index)
  return `
    <button class="drink ${revealed ? 'is-revealed' : ''} grade-${result.grade}" type="button"
      data-result-index="${index}" ${visible ? '' : 'hidden'}
      aria-label="${revealed ? `${index + 1}번째 결과: ${result.name}` : `${index + 1}번째 음료, 탭해서 확인`}">
      <span class="drink__cap"></span>
      <span class="drink__label">${revealed ? `${result.grade}등` : 'DRINK'}</span>
      <span class="drink__shine"></span>
    </button>`
}

function resultCardMarkup(result, index) {
  const revealed = state.revealed.has(index)
  return `
    <article class="result-card grade-${result.grade}${revealed ? ' is-revealed' : ''}" data-result-card="${index}">
      <span>${index + 1}번째 음료</span>
      <strong>${result.grade}등</strong>
      <p>${result.name.split(' · ')[1]}</p>
    </article>`
}

// 모달 내부 컨텐츠만 반환한다 — 바깥 오버레이(.modal-layer)·카드(.machine-modal)
// 엘리먼트 자체는 여기 포함하지 않는다. 연차 선택·추첨 등 상태 변화 때마다
// 이 안쪽만 갈아끼워야 바깥 래퍼의 CSS 진입 애니메이션이 매번 재생되어
// 모달 전체가 깜빡이는 문제(opacity/translate 리셋)를 피할 수 있다.
function modalInnerMarkup() {
  const machine = state.machine
  const isReady = state.phase === 'ready'
  const isResolving = ['brewing', 'dropping'].includes(state.phase)
  const isReveal = state.phase === 'reveal'
  const allRevealed = state.results.length > 0 && state.revealed.size === state.results.length
  const hasScrollableResults = state.results.length > 5
  const canClose = isReady
  const phaseText = isReady
    ? '레버를 끝까지 당기면 추첨이 시작됩니다.'
    : state.phase === 'brewing'
      ? '자판기가 음료를 준비하고 있어요…'
      : state.phase === 'dropping'
        ? '음료가 배출구로 떨어지고 있어요…'
        : allRevealed
          ? '모든 결과를 확인했습니다.'
          : '음료를 탭해서 결과를 확인하세요.'

  return `
    <header class="modal-header">
      <div><p class="eyebrow">SELECTED MACHINE</p><h2 id="machine-modal-title">${machine.title}</h2></div>
      <button type="button" class="icon-button" data-close-modal ${canClose ? '' : 'disabled'} aria-label="자판기 선택 화면으로 돌아가기">×</button>
    </header>

    <div class="machine-stage ${isResolving ? 'is-running' : ''} ${isReveal ? 'is-reveal' : ''}">
      <section class="vending-machine" aria-label="${machine.title}">
        <div class="vending-machine__top"><span>CHARACTER DRINK</span><b>${machine.title}</b><i></i></div>
        <div class="vending-machine__screen"><img src="${machine.image}" alt="${machine.title} 메인 이미지" /></div>
        <div class="vending-machine__works" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="vending-machine__bin" aria-live="polite">
          <p class="bin-empty" ${state.droppedCount ? 'hidden' : ''}>음료가 이곳으로 배출됩니다</p>
          ${hasScrollableResults ? '<button class="bin-scroll-control bin-scroll-control--previous" type="button" data-scroll-drinks="-1" aria-controls="dispensed-drinks" aria-label="이전 음료 보기">‹</button>' : ''}
          <div id="dispensed-drinks" class="drink-stack${hasScrollableResults ? ' is-scrollable' : ''}"
            aria-label="${hasScrollableResults ? '배출된 음료. 좌우로 스크롤해 모두 확인하세요.' : '배출된 음료'}">
            ${state.results.map(drinkMarkup).join('')}
          </div>
          ${hasScrollableResults ? '<button class="bin-scroll-control bin-scroll-control--next" type="button" data-scroll-drinks="1" aria-controls="dispensed-drinks" aria-label="다음 음료 보기">›</button>' : ''}
        </div>
      </section>

      <aside class="play-panel">
        <div class="play-step"><span>STEP 02</span><strong>연차 선택</strong></div>
        <div class="draw-counts" role="group" aria-label="연차 선택">${drawCountControls()}</div>
        <p class="lever-help">${phaseText}</p>
        <button type="button" class="lever-control" data-lever ${isReady ? '' : 'disabled'} aria-label="레버를 아래로 당기기">
          <span class="lever-control__track"><span class="lever-control__fill"></span></span>
          <span class="lever-control__handle"><i></i></span>
          <strong>당기기</strong>
          <small>끝까지 아래로</small>
        </button>
        <p class="fairness-note">당기는 속도·세기와 결과는 무관합니다.</p>
      </aside>
    </div>

    <section class="reveal-area" ${isReveal ? '' : 'hidden'}>
      <div class="reveal-area__header">
        <div><p class="eyebrow">STEP 03</p><h3>${state.drawCount}개의 음료가 도착했어요</h3></div>
        ${state.drawCount > 1 ? '<button type="button" class="reveal-all" data-reveal-all>모두 공개</button>' : ''}
      </div>
      <p class="reveal-guidance" data-reveal-guidance>${allRevealed ? '결과가 모두 공개되었습니다.' : '음료를 탭하면 등급 글로우와 함께 결과가 공개됩니다.'}</p>
      <div class="result-grid count-${state.results.length}">${state.results.map(resultCardMarkup).join('')}</div>
      ${allRevealed ? '<button class="finish-button" type="button" data-finish-session>확인 완료</button>' : ''}
    </section>

    ${state.notice ? `<p class="modal-notice" role="alert">${state.notice}</p>` : ''}
    ${!canClose && !isReveal ? '<p class="locked-note">추첨이 시작된 뒤에는 자판기를 변경할 수 없습니다.</p>' : ''}
  `
}

function renderModal() {
  const machine = state.machine
  return `
    <div class="modal-layer" data-modal-backdrop>
      <section class="machine-modal" role="dialog" aria-modal="true" aria-labelledby="machine-modal-title"
        style="--accent:${machine.accent};--machine-glow:${machine.glow}">
        ${modalInnerMarkup()}
      </section>
    </div>`
}

// 모달이 이미 열려 있는 상태에서의 상태 변화(연차 선택, 추첨 진행 단계 전환)는
// 이 함수로 내부만 갱신한다. render()를 다시 부르면 .modal-layer/.machine-modal
// 엘리먼트 자체가 새로 생성되어 진입 애니메이션이 재생되고 모달이 깜빡인다.
function refreshModalInner() {
  const modalEl = app.querySelector('.machine-modal')
  if (!modalEl) return
  modalEl.innerHTML = modalInnerMarkup()
  bindModalEvents()
}

function bindModalEvents() {
  app.querySelector('[data-close-modal]')?.addEventListener('click', closeModal)
  app.querySelectorAll('[data-draw-count]').forEach((button) => {
    button.addEventListener('click', () => setDrawCount(Number(button.dataset.drawCount)))
  })
  const lever = app.querySelector('[data-lever]')
  if (lever) installLever(lever)
  app.querySelectorAll('[data-result-index]').forEach((button) => {
    button.addEventListener('click', () => revealResult(Number(button.dataset.resultIndex)))
  })
  app.querySelectorAll('[data-scroll-drinks]').forEach((button) => {
    button.addEventListener('click', () => {
      const drinkStack = app.querySelector('#dispensed-drinks')
      if (!drinkStack) return
      const direction = Number(button.dataset.scrollDrinks)
      drinkStack.scrollBy({ left: direction * Math.max(80, drinkStack.clientWidth * 0.65), behavior: 'smooth' })
    })
  })
  app.querySelector('[data-reveal-all]')?.addEventListener('click', revealAll)
  app.querySelector('[data-finish-session]')?.addEventListener('click', finishSession)
}

function render() {
  app.innerHTML = renderHome()
  bindEvents()
}

function selectMachine(machineId) {
  clearTimers()
  normalizeDrawCount()
  state.machine = MACHINES.find((machine) => machine.id === machineId)
  state.phase = 'ready'
  state.results = []
  state.droppedCount = 0
  state.revealed = new Set()
  state.notice = ''
  render()
}

function closeModal() {
  if (state.phase !== 'ready') return
  clearTimers()
  state.machine = null
  state.notice = ''
  render()
}

function setDrawCount(count) {
  if (state.phase !== 'ready' || count > box.totalRemaining) return
  state.drawCount = count
  state.notice = ''
  refreshModalInner()
}

function startDraw() {
  if (state.phase !== 'ready') return

  try {
    // 운영 시 이 지점이 "POST /play-sessions/:id/draw"로 교체된다.
    // 서버는 재고 점유 확인, 멱등키, 트랜잭션 차감 후 이와 같은 결과 배열을 반환한다.
    state.results = box.drawMulti(state.drawCount).map((prize, index) => ({
      index,
      grade: prize.grade,
      name: prize.name,
      glow: prize.glow,
    }))
  } catch (error) {
    state.notice = error instanceof InsufficientStockError ? '잔여 재고가 부족해 선택한 연차를 시작할 수 없습니다.' : '추첨을 시작하지 못했습니다. 다시 시도해 주세요.'
    refreshModalInner()
    return
  }

  state.phase = 'brewing'
  state.droppedCount = 0
  state.revealed = new Set()
  state.notice = ''
  refreshModalInner()

  schedule(() => {
    state.phase = 'dropping'
    refreshModalInner()
    dropNextDrink(0)
  }, 1050)
}

function dropNextDrink(index) {
  const drink = app.querySelector(`[data-result-index="${index}"]`)
  if (drink) {
    drink.hidden = false
    drink.classList.add('is-dropped')
  }
  state.droppedCount = index + 1
  app.querySelector('.bin-empty')?.setAttribute('hidden', '')

  if (index + 1 < state.results.length) {
    schedule(() => dropNextDrink(index + 1), 360)
    return
  }

  schedule(() => {
    state.phase = 'reveal'
    refreshModalInner()
  }, 450)
}

function revealResult(index, { spotlight = true } = {}) {
  if (state.phase !== 'reveal' || state.revealed.has(index)) return
  state.revealed.add(index)
  const drink = app.querySelector(`[data-result-index="${index}"]`)
  const card = app.querySelector(`[data-result-card="${index}"]`)
  const result = state.results[index]
  drink?.classList.add('is-revealed')
  drink?.setAttribute('aria-label', `${index + 1}번째 결과: ${result.name}`)
  const label = drink?.querySelector('.drink__label')
  if (label) label.textContent = `${result.grade}등`
  card?.classList.add('is-revealed')
  if (spotlight && drink) showDrinkSpotlight(drink)
  updateRevealCompletion()
}

function revealAll() {
  if (state.phase !== 'reveal') return
  state.results.forEach((_, index) => revealResult(index, { spotlight: false }))
}

function showDrinkSpotlight(drink) {
  const spotlight = drink.cloneNode(true)
  spotlight.classList.add('drink--spotlight')
  spotlight.removeAttribute('data-result-index')
  spotlight.setAttribute('aria-hidden', 'true')
  spotlight.tabIndex = -1
  app.querySelector('.machine-stage')?.append(spotlight)
  schedule(() => spotlight.remove(), 800)
}

function updateRevealCompletion() {
  if (state.revealed.size !== state.results.length) return
  const guidance = app.querySelector('[data-reveal-guidance]')
  if (guidance) guidance.textContent = '결과가 모두 공개되었습니다.'
  const leverHelp = app.querySelector('.lever-help')
  if (leverHelp) leverHelp.textContent = '모든 결과를 확인했습니다.'
  if (!app.querySelector('[data-finish-session]')) {
    app.querySelector('.reveal-area')?.insertAdjacentHTML('beforeend', '<button class="finish-button" type="button" data-finish-session>확인 완료</button>')
    app.querySelector('[data-finish-session]')?.addEventListener('click', finishSession)
  }
}

function finishSession() {
  clearTimers()
  state.machine = null
  state.phase = 'select'
  state.results = []
  state.droppedCount = 0
  state.revealed = new Set()
  state.notice = ''
  render()
}

function installLever(lever) {
  let pointerId = null
  let startY = 0
  let pull = 0
  const setPull = (ratio) => {
    pull = Math.max(0, Math.min(1, ratio))
    lever.style.setProperty('--pull', pull)
  }

  lever.addEventListener('pointerdown', (event) => {
    if (state.phase !== 'ready') return
    pointerId = event.pointerId
    startY = event.clientY
    lever.setPointerCapture(pointerId)
    setPull(0)
  })
  lever.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return
    setPull((event.clientY - startY) / 110)
  })
  const release = (event) => {
    if (event.pointerId !== pointerId) return
    pointerId = null
    if (pull >= 0.78) startDraw()
    else setPull(0)
  }
  lever.addEventListener('pointerup', release)
  lever.addEventListener('pointercancel', release)
  lever.addEventListener('click', (event) => {
    if (event.detail === 0 && state.phase === 'ready') startDraw()
  })
}

function bindEvents() {
  app.querySelectorAll('[data-select-machine]').forEach((button) => {
    button.addEventListener('click', () => selectMachine(button.dataset.selectMachine))
  })
  app.querySelector('[data-modal-backdrop]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeModal()
  })
  bindModalEvents()
}

render()
