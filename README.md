# Character Drink Vending Kuji

Vite 기반의 캐릭터 드링크 자판기 쿠지 UX 프로토타입입니다. 자판기 선택은 테마만 바꾸며 모든 자판기는 하나의 박스형 재고와 확률을 공유합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

프로덕션 빌드는 다음과 같습니다.

```bash
npm run build
```

## Cloudflare Pages 설정

이 저장소는 GitHub 연결형 Cloudflare Pages 프로젝트로 배포합니다. Cloudflare 대시보드에서 아래 값으로 한 번만 연결하면 `main` 브랜치 푸시가 자동으로 운영 배포됩니다.

| 항목 | 값 |
| --- | --- |
| GitHub 저장소 | `zed367/vending` |
| 프로덕션 브랜치 | `main` |
| 프레임워크 | Vite |
| 빌드 명령 | `npm run build` |
| 빌드 출력 디렉터리 | `dist` |
| 루트 디렉터리 | `/` |

Cloudflare 대시보드에서 **Workers & Pages → Create application → Pages → Connect to Git** 순서로 저장소를 연결합니다. 첫 배포가 끝나면 운영 주소는 `vending.pages.dev` 형식으로 표시됩니다.

## 직접 배포

Git 연동을 설정하기 전 또는 긴급하게 현재 빌드를 직접 올릴 때만 사용합니다. 먼저 `wrangler login`으로 Cloudflare 로그인을 마쳐야 합니다.

```bash
npx wrangler pages project create vending
npm run deploy
```

> Cloudflare Pages 프로젝트는 처음 만들 때 Git 연동 또는 직접 업로드 중 하나를 선택합니다. 이후 GitHub 푸시 자동 배포를 원하면 Git 연동 방식으로 생성하세요.

## 수정 후 복붙 명령

변경 내용을 확인하고 운영 브랜치에 푸시합니다. GitHub 연동 Pages를 설정했다면 푸시 후 Pages 배포 상태를 확인하세요.

```bash
npm run build
git status --short
git add -A
git commit -m "설명"
git push origin main
```

Cloudflare Pages 대시보드의 **Deployments**에서 배포 상태와 생성된 URL을 확인할 수 있습니다.
