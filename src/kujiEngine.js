// 박스형(재고 차감) 쿠지 엔진. vibe_kuji의 순수 로직을 포션 UX에 맞게 분리했다.
// 이 모듈은 UX 프로토타입용 로컬 구현이며, 운영 환경에서는 동일 계약의 서버 API로 교체한다.

export class InsufficientStockError extends Error {
  constructor(requested, remaining) {
    super(`재고가 부족합니다. 요청: ${requested}, 잔여: ${remaining}`)
    this.name = 'InsufficientStockError'
    this.requested = requested
    this.remaining = remaining
  }
}

export class Prize {
  constructor({ grade, name, total, remaining = null, glow = '#ffffff' }) {
    this.grade = grade
    this.name = name
    this.total = total
    this.remaining = remaining === null ? total : remaining
    this.glow = glow
  }
}

export class KujiBox {
  constructor({ prizes, title = '쿠지 박스', lastOnePrize = null, random = Math.random }) {
    this.prizes = prizes
    this.title = title
    this.lastOnePrize = lastOnePrize
    this.random = random
    this.lastOneClaimed = false
  }

  get totalRemaining() {
    return this.prizes.reduce((sum, prize) => sum + prize.remaining, 0)
  }

  get isEmpty() {
    return this.totalRemaining === 0
  }

  draw() {
    const total = this.totalRemaining
    if (total <= 0) return null

    let ticket = this.random() * total
    for (const prize of this.prizes) {
      if (ticket < prize.remaining) {
        prize.remaining -= 1
        return prize
      }
      ticket -= prize.remaining
    }

    return null
  }

  // 부분 추첨은 허용하지 않는다. 선택한 연차 전체가 확보될 때만 결과를 확정한다.
  drawMulti(n) {
    if (!Number.isInteger(n) || n <= 0) throw new RangeError('추첨 횟수는 1 이상의 정수여야 합니다.')
    if (this.totalRemaining < n) throw new InsufficientStockError(n, this.totalRemaining)

    return Array.from({ length: n }, () => this.draw())
  }

  status() {
    const total = this.totalRemaining
    return this.prizes.map((prize) => ({
      grade: prize.grade,
      name: prize.name,
      remaining: prize.remaining,
      total: prize.total,
      glow: prize.glow,
      probability: total === 0 ? 0 : Math.round((prize.remaining / total) * 1000) / 10,
    }))
  }
}
