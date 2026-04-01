---
name: check-github-copilot-review
description: GitHub Copilot 리뷰 코멘트를 가져와서 코드 수정/기각 후 resolve하고 커밋·푸시하는 스킬
triggers: ["copilot review", "copilot 리뷰", "check copilot", "코파일럿 리뷰", "copilot-review"]
argument-hint: "[PR URL | PR number | (no args = current branch PR)]"
---

# Check GitHub Copilot Review

GitHub Copilot이 PR에 남긴 리뷰 코멘트를 자동으로 처리하는 스킬.
수정이 필요한 항목은 코드를 직접 고치고 댓글+resolve, 불필요한 항목은 사유 댓글+resolve 후 커밋·푸시합니다.

## When to Use

- PR에 Copilot 리뷰 코멘트가 달렸을 때
- Copilot 리뷰를 일괄 처리하고 싶을 때
- `copilot review`, `코파일럿 리뷰`, `check copilot` 키워드 사용 시

## Do Not Use When

- Copilot 리뷰가 아닌 사람 리뷰어의 코멘트를 처리할 때
- PR이 존재하지 않는 브랜치에서 작업할 때

## Requirements

- **GitHub CLI (`gh`)**: PR 정보 조회, 코멘트 작성, resolve에 필수
- **Git**: 코드 수정 후 커밋·푸시

## Execution Protocol

Claude MUST follow this workflow exactly when this skill is invoked.

---

### Stage 1: PR 식별 및 Copilot 리뷰 수집

#### 1-1. PR 식별

`{{ARGUMENTS}}`를 기반으로 PR을 식별합니다:

| Input | Action |
|-------|--------|
| PR URL (e.g., `https://github.com/owner/repo/pull/123`) | URL에서 owner/repo와 PR 번호 추출 |
| PR 번호 (e.g., `123`) | 현재 repo에서 해당 PR 번호 사용 |
| 없음 | 현재 브랜치의 PR 자동 탐지: `gh pr view --json number,url,headRefName` |

PR을 찾지 못하면 사용자에게 알리고 중단합니다.

#### 1-2. PR 정보 확인

```bash
gh pr view {PR_NUMBER} --json number,url,title,headRefName,baseRefName,state
```

PR이 `OPEN` 상태인지 확인합니다. closed/merged PR은 경고 후 중단.

#### 1-3. Copilot 리뷰 코멘트 수집

GitHub API를 사용하여 Copilot이 남긴 리뷰 코멘트를 가져옵니다:

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments --paginate --jq '[.[] | select((.user.login == "copilot-pull-request-reviewer[bot]" or .user.login == "github-copilot[bot]" or (.user.type == "Bot" and (.user.login | test("copilot"; "i")))) and .in_reply_to_id == null) | {id, path, line, side, body, in_reply_to_id, subject_type, diff_hunk, original_line, position}]'
```

> **필터링**: `in_reply_to_id`가 null인 최상위 코멘트만 처리 대상으로 삼습니다 (이미 답글이 달린 스레드의 원본).

코멘트가 없으면 "Copilot 리뷰 코멘트가 없습니다"를 출력하고 종료합니다.

#### 1-4. 리뷰 코멘트 목록 출력

수집된 코멘트를 사용자에게 표시합니다:

```
## Copilot 리뷰 코멘트 ({N}건)

| # | 파일 | 라인 | 요약 |
|---|------|------|------|
| 1 | src/auth.ts | 42 | 비밀번호 해싱 필요 |
| 2 | src/api.ts | 15 | 에러 핸들링 누락 |
...
```

---

### Stage 2: 각 코멘트 분석 및 처리

각 Copilot 코멘트에 대해 아래 프로세스를 수행합니다.

#### 2-1. 코멘트 분석

각 코멘트에 대해:
1. 해당 파일의 관련 코드를 읽습니다 (Read tool 사용)
2. Copilot의 지적 내용을 분석합니다
3. 아래 기준으로 **수정 필요(FIX)** 또는 **불필요(DISMISS)** 를 판단합니다

**FIX 판단 기준:**
- 실제 버그나 논리 오류가 있는 경우
- 보안 취약점이 존재하는 경우
- 에러 핸들링이 누락된 경우
- 성능 문제가 명확한 경우
- 코드 품질이 명확히 개선되는 경우

**DISMISS 판단 기준:**
- 이미 다른 곳에서 처리되고 있는 경우
- 프로젝트 컨벤션에 맞는 의도적 패턴인 경우
- 오탐(false positive)인 경우
- 수정 시 오히려 가독성이 떨어지거나 불필요한 복잡성이 추가되는 경우
- 컨텍스트를 고려하면 현재 코드가 적절한 경우

#### 2-2. FIX 처리

수정이 필요한 코멘트:

1. **코드 수정**: Edit tool로 해당 파일의 코드를 수정합니다
2. **댓글 작성**: 수정 내용을 설명하는 답글을 남깁니다
   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr_number}/comments -f body="수정했습니다. {변경 내용 요약}" -f in_reply_to={comment_id}
   ```
3. **Resolve**: 해당 리뷰 스레드를 resolve합니다
   - 먼저 모든 review thread를 가져와서 comment_id → thread_id 매핑을 구축합니다. 100건 이상이면 `after` 커서로 pagination합니다:
   ```bash
   gh api graphql -f query='
   query($owner: String!, $repo: String!, $pr: Int!) {
     repository(owner: $owner, name: $repo) {
       pullRequest(number: $pr) {
         reviewThreads(first: 100) {
           nodes {
             id
             isResolved
             comments(first: 1) {
               nodes {
                 databaseId
               }
             }
           }
           pageInfo {
             hasNextPage
             endCursor
           }
         }
       }
     }
   }' -f owner="{owner}" -f repo="{repo}" -F pr={pr_number}
   ```
   - 결과에서 `comments.nodes[0].databaseId`가 대상 comment_id와 일치하는 thread의 `id`를 찾습니다.
   - 그런 다음 thread를 resolve합니다:
   ```bash
   gh api graphql -f query='
   mutation($threadId: ID!) {
     resolveReviewThread(input: {threadId: $threadId}) {
       thread {
         isResolved
       }
     }
   }' -f threadId="{thread_node_id}"
   ```

#### 2-3. DISMISS 처리

불필요한 코멘트:

1. **기각 사유 댓글**: 왜 수정하지 않는지 설명하는 답글을 남깁니다
   ```bash
   gh api repos/{owner}/{repo}/pulls/{pr_number}/comments -f body="수정하지 않습니다. 사유: {기각 이유}" -f in_reply_to={comment_id}
   ```
2. **Resolve**: FIX와 동일한 방식으로 리뷰 스레드를 resolve합니다

---

### Stage 3: 커밋 및 푸시

#### 3-1. 변경사항 확인

```bash
git status
git diff
```

수정된 파일이 없으면 (모두 DISMISS된 경우) 커밋·푸시를 건너뜁니다.

#### 3-2. 커밋

수정된 파일들만 스테이징하고 커밋합니다:

```bash
git add {수정된 파일 목록}
git commit -m "fix: address GitHub Copilot review feedback

- {수정 항목 1 요약}
- {수정 항목 2 요약}
..."
```

> 커밋 메시지는 실제 수정 내용을 반영하여 작성합니다.

#### 3-3. 푸시

현재 PR의 head branch로 푸시합니다:

```bash
git push origin {head_branch_name}
```

---

### Stage 4: 결과 보고

처리 완료 후 사용자에게 결과를 보고합니다:

```
## Copilot 리뷰 처리 결과

- **전체 코멘트:** {N}건
- **수정(FIX):** {N}건
- **기각(DISMISS):** {N}건
- **커밋:** {commit hash} (또는 "변경사항 없음")
- **푸시:** {branch name} (또는 "스킵")

### 수정 항목
| # | 파일 | 수정 내용 |
|---|------|-----------|
| 1 | src/auth.ts:42 | bcrypt 해싱 적용 |
...

### 기각 항목
| # | 파일 | 기각 사유 |
|---|------|-----------|
| 1 | src/api.ts:15 | 상위 미들웨어에서 처리됨 |
...
```

---

## Error Handling

| Failure | Fallback |
|---------|----------|
| `gh` CLI 미설치 | 에러 메시지 출력 후 중단 |
| PR을 찾을 수 없음 | 사용자에게 PR URL/번호 입력 요청 |
| Copilot 코멘트 없음 | "코멘트 없음" 보고 후 정상 종료 |
| 코드 수정 실패 (파일 없음 등) | 해당 항목 건너뛰고 사유 보고 |
| 댓글 작성 실패 | 재시도 1회, 실패 시 건너뛰고 보고 |
| Resolve 실패 | 경고 출력 후 계속 진행 (수동 resolve 안내) |
| 푸시 실패 (권한 등) | 에러 보고, 로컬 커밋은 유지 |
| GraphQL API 실패 | resolve 건너뜀 (리뷰 스레드 resolve는 GraphQL만 지원) |

---

## Examples

```bash
# 현재 브랜치 PR의 Copilot 리뷰 처리
/check-github-copilot-review

# 특정 PR 번호로 처리
/check-github-copilot-review 123

# PR URL로 처리
/check-github-copilot-review https://github.com/myorg/myrepo/pull/456
```
