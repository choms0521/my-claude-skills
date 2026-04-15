---
name: music-generator
description: mmx music generate CLI를 사용하여 노래를 생성하는 스킬. 가사 직접 제공 또는 인터뷰 기반 작곡 지원.
triggers: ["music-generator", "music generate", "make music", "create song", "노래 만들어", "작곡", "음악 생성", "배경음악", "instrumental"]
argument-hint: "[가사 텍스트] [--instrumental] [--genre <genre>] [--bpm <number>] [--key <key>] [--mood <mood>] [--vocals <text>] [--tempo <text>] [--instruments <text>] [--structure <text>] [--out <path>]"
---

# Music Generator Skill

mmx music generate CLI를 래핑하여 노래를 생성합니다.
두 가지 모드를 지원합니다:

1. **Direct Mode**: 가사와 메타 정보가 함께 제공되면 즉시 mmx CLI를 호출하여 mp3를 생성
2. **Interview Mode**: 가사 없이 요청하면 단계별 질문으로 요구사항을 수집한 후 생성

---

## Pre-Check

스킬 실행 전 반드시 mmx CLI 설치 여부를 확인합니다:

```bash
which mmx
```

- 실패 시: "mmx CLI가 설치되어 있지 않습니다. 설치 후 다시 시도해주세요." 안내 후 종료
- 성공 시: 모드 분기로 진행

---

## Mode Selection

사용자 요청을 분석하여 모드를 결정합니다:

| 조건 | 모드 |
|------|------|
| 가사가 텍스트로 제공됨 | **Direct Mode** |
| `--instrumental` 플래그 또는 "배경음악", "인스트루멘탈" 자연어 키워드 | **Direct Mode (Instrumental)** |
| 가사 없음 + instrumental 아님 | **Interview Mode** |

**중요:**
- `--instrumental`과 `--lyrics-file`은 동시 사용 불가 (mmx CLI 제약)
- "배경음악 만들어줘" 같은 자연어도 Instrumental로 분류

---

## Direct Mode

가사와 메타 정보가 제공된 경우 즉시 mmx CLI를 호출합니다.

### 1. --prompt 구성 (필수)

`--prompt`는 mmx CLI의 **필수 옵션**입니다. 항상 생성하여 전달해야 합니다.

**조합 규칙:**
- 장르 + 분위기 + 보컬 특성 + 멤버 정보(있는 경우)를 자연어 문장으로 조합
- 멤버/보컬 정보가 있으면 그룹 구성, 포지션, 특징을 자연어로 녹여냄
- **듀엣/다중 보컬 시**: "Two distinct singers alternating", "Male-female duet" 등 보컬 구분을 prompt 첫 부분에 명시적으로 강조

**예시 (솔로/그룹):**
```
--prompt "K-POP summer pop, 5-member girl group with bright female vocals, main vocalist with powerful high notes, one rapper with dynamic flow, synth-driven upbeat arrangement"
```

**예시 (듀엣):**
```
--prompt "Male-female duet K-POP song. Two distinct singers alternating verses: sweet clear female soprano voice and warm youthful male tenor voice. They sing together in chorus with harmonies."
```

### 2. 가사 전달 (--lyrics-file 필수)

가사는 **항상 임시 파일을 통해 --lyrics-file로 전달**합니다. `--lyrics`로 직접 전달하지 않습니다 (셸 이스케이프 위험).

**절차:**
1. 가사를 `/tmp/mmx-lyrics-{timestamp}.txt`에 저장
2. `--lyrics-file /tmp/mmx-lyrics-{timestamp}.txt`로 전달
3. mmx 실행 완료 후 (성공/실패 무관) 임시 파일 삭제

### 3. CLI 옵션 매핑

사용자가 제공한 메타 정보를 mmx CLI 옵션에 매핑합니다:

| 사용자 입력 | mmx 옵션 |
|------------|----------|
| 장르 | --genre |
| 분위기/감정 | --mood |
| BPM (숫자) | --bpm |
| 빠르기 (자연어) | --tempo |
| Key | --key |
| 보컬 스타일 | --vocals |
| 악기 구성 | --instruments |
| 곡 구조 | --structure |
| 피해야 할 요소 | --avoid |
| 참고곡/아티스트 | --references |
| 사용 목적 | --use-case |
| 추가 요청 | --extra |
| 스타일 설명 (필수) | --prompt |
| 출력 파일 | --out |

### 4. 파일명 생성 규칙

`--out` 옵션의 파일명은 다음 규칙으로 자동 생성합니다:

- 곡 제목에서 파일명 생성
- 공백 → 하이픈(`-`)
- 특수문자(따옴표, 슬래시, 콜론 등) → 제거
- 한국어/일본어 → 허용 (파일시스템 지원)
- 영문은 소문자로 변환
- 길이 상한: 80자
- 확장자: `.mp3`
- 경로: 현재 작업 디렉토리
- 파일 충돌: 동일 파일명이 존재하면 `-2`, `-3` suffix 부여 (예: `summer-diary-2.mp3`)

**BPM/Tempo 우선순위:** `--bpm`(숫자)이 `--tempo`(자연어)보다 우선합니다. 둘 다 제공 시 `--bpm`만 사용하고 `--tempo`는 생략합니다.

**예시:**
- "Summer Diary" → `./summer-diary.mp3`
- "여름빛 다이어리" → `./여름빛-다이어리.mp3`
- "ナツイロ・ダイアリー" → `./ナツイロ・ダイアリー.mp3`

### 5. CLI 조립 예시

**예시 1: 가사 + 메타 정보 제공**
```bash
# 1. 가사를 임시 파일에 저장
cat > /tmp/mmx-lyrics-1713160800.txt << 'LYRICS_EOF'
[Intro]
Se! No! ナツイロ~!

[Verse 1]
放課後の チャイムが鳴って
五人 集まる いつもの場所

[Chorus]
ナツイロ・ダイアリー ページを開いて
五つの色で 描く ストーリー
LYRICS_EOF

# 2. mmx CLI 호출
mmx music generate \
  --prompt "K-POP / J-POP summer pop, 5-member girl group with bright vocals, main vocalist HARU with powerful high notes, rapper SORA with dynamic flow, synth-pop arrangement" \
  --lyrics-file /tmp/mmx-lyrics-1713160800.txt \
  --vocals "bright female group vocals with harmonies, one rapper section" \
  --genre "K-POP / J-POP Summer Pop" \
  --mood "upbeat, bright, nostalgic" \
  --bpm 125 \
  --key "G major" \
  --instruments "synth, electric guitar, bass, drums" \
  --structure "intro-verse-prechorus-chorus-rap-verse-prechorus-chorus-bridge-chorus-outro" \
  --out ./natsuyro-diary.mp3

# 3. 임시 파일 삭제
rm -f /tmp/mmx-lyrics-1713160800.txt
```

**예시 2: Instrumental**
```bash
mmx music generate \
  --prompt "Lo-fi hip hop study beats, warm and relaxing atmosphere" \
  --instrumental \
  --genre "Lo-fi Hip Hop" \
  --mood "calm, relaxing" \
  --tempo "slow" \
  --instruments "piano, vinyl crackle, soft drums" \
  --out ./study-beats.mp3
```

### 6. 실행 및 결과 안내

- CLI 명령어를 사용자에게 보여준 뒤 실행
- 성공 시: 파일 경로 안내, 재생 방법 제안
- 실패 시: Error Handling 섹션 참조

---

## Interview Mode

가사 없이 "노래 만들어줘"라고 요청한 경우, 단계별 질문으로 요구사항을 수집합니다.

### Stage 0: Instrumental 확인

첫 번째 질문으로 인스트루멘탈 여부를 확인합니다.

**질문:** "인스트루멘탈(반주만)로 만드시겠습니까, 보컬이 있는 노래로 만드시겠습니까?"

**선택지:**
- 인스트루멘탈 (반주만) → `--instrumental` 플래그 설정, vocals 질문 건너뛰기, 가사 생성 생략
- 보컬 있는 노래 → 다음 단계로 진행

### Stage 1: 모드 선택 (Expert / Easy)

**질문:** "음악 설정을 어떻게 진행할까요?"

**선택지:**
- **Easy 모드** (초보자 친화): 쉬운 질문 7개, 힌트 풍부, 전문 용어 최소화
- **Expert 모드** (상세 설정): BPM, Key 등 전문적 옵션 9개 직접 입력

### Stage 2: 단계별 질문

각 질문은 **반드시 하나씩** AskUserQuestion으로 물어봅니다.
모든 질문에 "건너뛰기(skip)" 옵션을 포함합니다.
skip 시 AI가 다른 답변들을 종합하여 최적의 값을 자동 추론합니다.
추론이 불가능하면 해당 CLI 옵션을 생략합니다 (mmx 기본값 사용).

#### Easy 모드 질문 (7개)

**Q1. 장르**
- 질문: "어떤 장르의 노래를 만들까요?"
- 힌트: K-POP, J-POP, 발라드, 힙합, EDM, R&B, 록, 인디, 재즈
- CLI: `--genre`
- skip 기본값: "pop"

**Q2. 빠르기 (Tempo)**
- 질문: "노래의 빠르기는 어떻게 할까요?"
- 힌트: 느리게(slow), 보통(moderate), 빠르게(fast), 매우 빠르게(very fast)
- CLI: `--tempo`
- skip 기본값: mood에서 추론 (신나는 → fast, 슬픈 → slow)

**Q3. 분위기/감정**
- 질문: "어떤 분위기의 노래를 원하시나요?"
- 힌트: 신나는, 슬픈, 따뜻한, 몽환적인, 파워풀한, 잔잔한, 청량한
- CLI: `--mood`
- skip 기본값: genre에서 추론 (EDM → energetic, 발라드 → emotional)

**Q4. 보컬 스타일** *(instrumental이면 건너뛰기)*
- 질문: "어떤 목소리로 불렀으면 좋겠나요?"
- 힌트: 남성 솔로, 여성 솔로, 남녀 듀엣, 걸그룹, 보이그룹, 혼성
- CLI: `--vocals`
- skip 기본값: "female vocals"

**Q5. 사용 목적**
- 질문: "이 노래는 어떤 용도로 사용하시나요?"
- 힌트: 타이틀곡, 영상 배경음악, 게임 OST, 카페 음악, 운동 음악
- CLI: `--use-case`
- skip 기본값: 생략

**Q6. 참고곡/아티스트**
- 질문: "참고할 만한 곡이나 아티스트가 있나요? (선택)"
- 힌트: 자유 입력 (예: "BTS - Dynamite 같은 느낌", "요아소비 스타일")
- CLI: `--references`
- skip 기본값: 생략

**Q7. 추가 요청사항**
- 질문: "추가로 원하시는 것이 있으면 자유롭게 말씀해 주세요!"
- 힌트: 자유 텍스트 입력
- CLI: `--extra`
- skip 기본값: 생략

**Easy 모드 미수집 옵션 처리:**
- `--instruments`: `--genre`와 `--mood`에서 AI가 자동 추론하여 `--prompt`에 녹임
- `--structure`: 생략 (mmx 기본 구조 사용)
- `--bpm`: `--tempo`에서 AI가 자동 추론하여 생략 또는 `--prompt`에 녹임

#### Expert 모드 질문 (9개)

**Q1. 장르**
- 질문: "장르를 지정해 주세요."
- 힌트: K-POP, J-POP, Synth Pop, Lo-fi Hip Hop, Future Bass, City Pop, R&B, Rock, Jazz, Classical
- CLI: `--genre`
- skip 기본값: "pop"

**Q2. BPM**
- 질문: "BPM을 지정해 주세요. (숫자 입력)"
- 힌트: 60-80 (발라드), 90-110 (R&B/힙합), 120-140 (팝/댄스), 140+ (EDM/드럼앤베이스)
- CLI: `--bpm`
- skip 기본값: genre/tempo에서 추론

**Q3. Key**
- 질문: "Key를 지정해 주세요."
- 힌트: C major, G major, A minor, D major, E minor, F major, B flat major
- CLI: `--key`
- skip 기본값: 생략 (mmx 자동 결정)

**Q4. 보컬 스타일** *(instrumental이면 건너뛰기)*
- 질문: "보컬 스타일을 상세히 설명해 주세요."
- 힌트: "warm female soprano", "male baritone with raspy tone", "5-member girl group with harmonies and one rapper"
- CLI: `--vocals`
- skip 기본값: "female vocals"

**Q5. 악기 구성**
- 질문: "사용할 악기를 지정해 주세요."
- 힌트: acoustic guitar, electric guitar, piano, synth, bass, drums, strings, brass, violin, flute
- CLI: `--instruments`
- skip 기본값: genre에서 추론

**Q6. 곡 구조**
- 질문: "곡의 구조를 지정해 주세요."
- 힌트: verse-chorus-verse-chorus, verse-prechorus-chorus-verse-prechorus-chorus-bridge-chorus, intro-verse-chorus-rap-bridge-chorus-outro
- CLI: `--structure`
- skip 기본값: 생략 (mmx 기본 구조)

**Q7. 피해야 할 요소**
- 질문: "피하고 싶은 음악적 요소가 있나요?"
- 힌트: heavy bass, autotune, distortion, electronic sounds, rap section
- CLI: `--avoid`
- skip 기본값: 생략

**Q8. 참고곡/아티스트**
- 질문: "참고할 곡이나 아티스트가 있으면 알려주세요."
- 힌트: 자유 입력
- CLI: `--references`
- skip 기본값: 생략

**Q9. 추가 요청사항**
- 질문: "추가로 원하시는 것이 있으면 자유롭게 말씀해 주세요!"
- 힌트: 자유 텍스트 입력
- CLI: `--extra`
- skip 기본값: 생략

### Stage 3: 파라미터 요약 확인 (Review Step)

모든 질문 완료 후, 수집된 파라미터를 한눈에 보여주고 확인합니다:

```
수집된 설정:
- 장르: K-POP Summer Pop
- 빠르기: fast
- 분위기: 신나는, 밝은
- 보컬: 여성 그룹 (5인)
- BPM: 125
- Key: G Major
...

이대로 진행하시겠습니까?
[확인] [수정할 항목 선택]
```

수정 요청 시 해당 항목만 재질문합니다.

확인 후 곡 제목을 질문합니다:
- "곡의 제목을 정해주세요! (건너뛰면 장르+타임스탬프로 자동 생성합니다)"
- 제목은 파일명 생성에 사용 (Direct Mode 파일명 규칙 적용)
- skip 시: `{genre}-{timestamp}.mp3` 형식으로 자동 생성

### Stage 4: 가사 생성

**instrumental이 아닌 경우에만 실행합니다.**

인터뷰 결과를 종합하여 Claude가 가사를 작성합니다.

**가사 작성 규칙:**
- 구조 태그 포함: `[Intro]`, `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Verse 2]`, `[Rap]`, `[Bridge]`, `[Outro]` 등
- **듀엣/다중 보컬 시**: 구조 태그 대신 `[Female]`, `[Male]`, `[Both]` 태그를 사용하여 파트를 명확히 구분. mmx가 보컬 음색을 전환하는 데 이 태그가 중요함
- 장르와 분위기에 맞는 가사 스타일
- 보컬 스타일에 맞는 파트 분배 (그룹인 경우)
- `--structure`가 지정되었으면 해당 구조에 맞춤

**듀엣/다중 보컬 시 추가 필수 설정:**
- `--vocals`: "duet with harmonies, alternating male and female verses" 등 교대 구조를 명시
- `--extra`: "Must have two distinct vocal timbres" 등 음색 구분을 강조
- 이 설정 없이는 단일 보컬로 생성될 수 있음

**확인/수정:**
- 작성된 가사를 사용자에게 보여주고 확인 요청
- 수정은 **최대 3회**까지 허용
- 3회 초과 시 현재 버전으로 진행

### Stage 5: CLI 구성 및 실행

**진입 조건:**
- Stage 3 파라미터 검토 완료 (사용자 "확인" 응답)
- Stage 4 가사 확인 완료 (사용자 "확인" 응답, 또는 수정 3회 초과 후 "현재 버전으로 진행합니다." 안내)
- Instrumental 모드인 경우: Stage 3 완료만으로 진입

Direct Mode와 동일한 절차로 CLI를 구성하고 실행합니다:

1. `--prompt` 조합 (필수) — 인터뷰 결과에서 장르 + 분위기 + 보컬 특성을 자연어 문장으로
2. 가사 → `/tmp/mmx-lyrics-{timestamp}.txt` 임시 파일 (instrumental이 아닌 경우)
3. 인터뷰 답변 → 각 mmx CLI 옵션에 매핑
4. CLI 명령어 조립 → 사용자에게 보여주기
5. mmx 실행
6. 임시 파일 삭제 (성공/실패 무관)
7. 결과 안내

---

## Error Handling

| 에러 상황 | 감지 방법 | 대응 |
|-----------|-----------|------|
| mmx CLI 미설치 | `which mmx` 실패 | "mmx CLI가 설치되어 있지 않습니다. 설치 후 다시 시도해주세요." 안내 후 종료 |
| API 키 미설정 | mmx 실행 시 인증 에러 (exit code != 0, 에러 메시지에 "auth" 또는 "key" 포함) | "mmx API 키가 설정되지 않았습니다. `mmx auth` 또는 `--api-key` 설정을 확인해주세요." |
| 네트워크 오류 | mmx 실행 시 연결 실패 (에러 메시지에 "network" 또는 "connection" 포함) | "네트워크 연결을 확인해주세요." + 재시도 안내 |
| 생성 실패 | mmx exit code != 0 (위 케이스에 해당하지 않음) | 에러 메시지 표시 + "설정을 변경하여 다시 시도하시겠습니까?" |
| 임시 파일 생성 실패 | 파일 쓰기 에러 | "/tmp 디렉토리 권한을 확인해주세요." 안내 |

**중요:** 어떤 에러가 발생하더라도 임시 가사 파일(`/tmp/mmx-lyrics-*.txt`)은 반드시 삭제합니다.

```bash
# 에러 발생 시에도 cleanup 보장 (타임스탬프 기반 특정 파일만 삭제)
LYRICS_TMP="/tmp/mmx-lyrics-$(date +%s%N).txt"
# ... 가사 파일 생성 ...
mmx music generate ... --lyrics-file "$LYRICS_TMP" --out ./output.mp3
rm -f "$LYRICS_TMP"
```

---

## Behavior

- 기본 오디오 포맷: mp3
- 기본 샘플레이트: 44100 Hz
- 기본 비트레이트: 256000 bps
- 출력 경로: 현재 작업 디렉토리
- 파일명: 곡 제목 기반 자동 생성
- 가사 전달: 항상 `--lyrics-file` (임시 파일 경유)
- `--lyrics-optimizer` 미사용: Claude가 인터뷰 결과를 반영하여 직접 작사하는 것이 문맥 이해도와 품질 면에서 우수

---

## CLI Options Reference

mmx music generate의 전체 옵션 참조 테이블입니다:

| 옵션 | 타입 | 설명 | 본 스킬 사용 여부 |
|------|------|------|------------------|
| `--prompt` | text | 음악 스타일 설명 **(필수)** | O (항상 생성) |
| `--lyrics` | text | 가사 직접 전달 | X (--lyrics-file 사용) |
| `--lyrics-file` | path | 파일에서 가사 읽기 | O (기본 전략) |
| `--lyrics-optimizer` | flag | 프롬프트 기반 자동 가사 생성 | X (Claude가 작사) |
| `--instrumental` | flag | 인스트루멘탈 모드 (보컬 없음) | O |
| `--vocals` | text | 보컬 스타일 설명 | O |
| `--genre` | text | 음악 장르 | O |
| `--mood` | text | 분위기/감정 | O |
| `--tempo` | text | 빠르기 자연어 설명 (fast, slow 등) | O (Easy 모드) |
| `--bpm` | number | 정확한 BPM 숫자 | O (Expert 모드) |
| `--key` | text | 음악 Key (예: C major) | O (Expert 모드) |
| `--instruments` | text | 사용 악기 | O |
| `--structure` | text | 곡 구조 | O (Expert 모드) |
| `--avoid` | text | 피해야 할 요소 | O (Expert 모드) |
| `--references` | text | 참고곡/아티스트 | O |
| `--use-case` | text | 사용 목적 | O (Easy 모드) |
| `--extra` | text | 추가 세부 요청 | O |
| `--aigc-watermark` | flag | AI 생성 컨텐츠 워터마크 삽입 | 선택 |
| `--format` | fmt | 오디오 포맷 (기본: mp3) | 선택 |
| `--sample-rate` | hz | 샘플레이트 (기본: 44100) | 선택 |
| `--bitrate` | bps | 비트레이트 (기본: 256000) | 선택 |
| `--stream` | flag | 실시간 오디오 스트리밍 | 선택 |
| `--out` | path | 출력 파일 경로 | O (항상 지정) |

---

## Notes

- mmx CLI가 설치되어 있어야 합니다 (`which mmx`로 확인)
- 생성에 시간이 걸릴 수 있습니다 (곡 길이에 따라 수십 초 ~ 수 분)
- `--instrumental`과 `--lyrics`/`--lyrics-file`은 동시 사용 불가
- `--bpm`(숫자)과 `--tempo`(자연어)는 모두 사용 가능하며, 둘 다 제공 시 `--bpm`이 우선
- Expert 모드에서 오디오 품질 옵션(`--format`, `--sample-rate`, `--bitrate`)은 추가 요청사항(Q9)에서 자유 텍스트로 요청 가능
