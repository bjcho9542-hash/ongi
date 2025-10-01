# Repository Guidelines

## Project Structure & Module Organization
- `src/app`은 라우트, 페이지, 서버 액션을 포함하며 라우트별 설정은 해당 폴더의 `page.tsx` 또는 `route.ts`에서 관리합니다.
- `src/components`는 재사용 가능한 프레젠테이션 컴포넌트를 모으고, 도메인 로직이나 API 래퍼는 `src/lib`로 분리해 유지보수성을 확보합니다.
- Supabase 스키마는 `supabase` 디렉터리의 순번이 매겨진 SQL 스크립트로 관리하므로, 새 마이그레이션은 마지막 번호 다음을 사용하고 변경 내역을 파일 상단 주석으로 요약하세요.
- 정적 자산은 `public/`, 환경 설정은 `src/env.ts`, 공용 타입은 `src/types`에 위치하므로 신규 파일 추가 시 동일한 경로 규칙을 따릅니다.

## Build, Test, and Development Commands
- `npm run dev`: 개발 서버를 `http://localhost:3000`에서 실행하며 코드 변경을 실시간 반영합니다.
- `npm run build`: 프로덕션 번들을 생성하고 타입·린트 오류를 검증하므로 배포 전 필수로 실행합니다.
- `npm run start`: 빌드 결과를 이용해 로컬에서 프로덕션 모드를 검수할 때 사용합니다.
- `npm run lint`: Next.js ESLint 프리셋으로 정적 분석을 수행하니 PR 제출 전 확인하고 경고를 해결합니다.

## Coding Style & Naming Conventions
- TypeScript 5, ESLint, Prettier 없이 2-스페이스 들여쓰기를 유지합니다. JSX와 서버 컴포넌트에서도 동일한 규칙을 지킵니다.
- React 컴포넌트는 `PascalCase`, 훅과 유틸 함수는 `camelCase`, 환경 변수는 필요 시 `NEXT_PUBLIC_` 접두사를 붙입니다.
- Tailwind CSS는 목적 기반 클래스 순서를 유지하고 조건부 클래스 결합은 `clsx`를 활용합니다.

## Testing Guidelines
- 기본 테스트 프레임워크는 아직 정의되지 않았으므로 기능별로 React Testing Library 기반 단위 테스트 또는 Playwright e2e 테스트를 도입하세요.
- 테스트 파일은 `src/__tests__/*.test.tsx` 또는 e2e의 경우 `tests/e2e/*.spec.ts` 네이밍을 사용하고, 새 디렉터리를 추가하면 README에 실행 방법을 갱신합니다.
- 최소 품질 게이트로 `npm run lint`를 유지하되, 주요 흐름에는 API 응답과 사용자 상호작용을 검증하는 통합 테스트를 추가합니다.

## Commit & Pull Request Guidelines
- Git 로그는 `fix:` 같은 Conventional Commits 패턴을 사용하므로 `feat`, `fix`, `chore`, `refactor` 등 타입을 명시하고 현재형 명령문으로 요약합니다.
- PR 설명에는 변경 요약, 검증 방법(예: ``npm run lint`` 결과), 관련 이슈/티켓을 포함하고 UI 변화가 있다면 `public/`에 스크린샷을 추가해 링크하세요.
- Supabase 스키마를 수정하면 영향 범위와 롤백 전략을 체크리스트로 남겨 리뷰어가 배포 전에 확인할 수 있도록 합니다.

## Environment & Security
- 민감한 키는 `.env.local`에만 저장하고 Vercel 프로젝트 환경 변수와 동기화합니다. Supabase 서비스 롤 키는 서버 전용 코드에서만 불러옵니다.
- `force-dynamic` 라우트는 캐싱 정책에 민감하므로 캐시 전략을 변경할 때 CDN 영향 범위를 PR 본문에 기록하고, 필요한 경우 `revalidateTag` 사용 여부를 문서화하세요.
