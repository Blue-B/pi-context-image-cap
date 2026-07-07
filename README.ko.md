# pi-context-image-cap

pi 세션에 스크린샷과 이미지가 쌓이는 걸 막아주는 패키지입니다.

자주 브라우저, winshot, 기타 도구에서 이미지를 붙여넣는 경우에 유용합니다.

## 왜 만들었나

pi의 기본 compaction은 텍스트를 요약하는 데 집중합니다. 이미지는 base64 형태로 그대로 남아서 매 요청마다 provider에 다시 전송됩니다. 시간이 지나면 세션이 점점 무거워지고, 불필요한 compaction이 발생하거나 실패하는 원인이 됩니다.

이 패키지는 두 가지 방식으로 문제를 줄여줍니다:

- provider에 요청을 보낼 때 오래된 이미지를 자동으로 정리하는 확장
- 이미 부푼 세션 파일을 정리하는 오프라인 스크립트

## 포함된 기능

### 실시간 방지 (extension)

`extensions/context-image-cap.ts`

provider 요청을 보낼 때마다 최근 이미지 몇 장만 남기고 나머지는 짧은 텍스트 placeholder로 대체합니다.

디스크에 저장된 세션 내용은 그대로 두고, 모델에 전달되는 데이터만 줄입니다.

### 오프라인 정리 (script)

`scripts/cap-session-images.mjs`

이미 커져버린 `.jsonl` 세션 파일을 정리하는 도구입니다.

```bash
# 어떤 변화가 생길지 미리 확인
node scripts/cap-session-images.mjs --dry session.jsonl

# 이미지를 1x1 placeholder로 교체 (토큰 최소화)
node scripts/cap-session-images.mjs session.jsonl

# 64x64 크기로 교체 (조금 덜 파괴적)
node scripts/cap-session-images.mjs --mode downscale session.jsonl

# 최근 5장만 남기고 나머지 정리
node scripts/cap-session-images.mjs --keep 5 session.jsonl
```

파일을 수정하기 전에 항상 백업을 만듭니다.

## 설치

```bash
pi install git:Blue-B/pi-context-image-cap
```

## 주의사항

- 이 도구는 이미지를 모델이 보지 못하게 하거나 줄이는 방향으로 동작합니다. 오래된 스크린샷을 다시 확인해야 하는 작업이라면 `KEEP_IMAGES` 값을 늘리거나 `--mode downscale`을 사용하는 걸 추천합니다.
- 오프라인 스크립트는 세션 파일의 이미지 데이터를 변경하므로, `--dry` 옵션으로 먼저 확인한 뒤 진행하세요.
- 이 도구는 `claude-bridge`에만 국한되지 않습니다. 이미지를 많이 사용하는 어떤 provider에서도 도움이 될 수 있습니다.

## 라이선스

MIT

## 후원

이 프로젝트가 도움이 됐다면 아래 링크로 후원해 주세요:

- [GitHub Sponsors](https://github.com/sponsors/Blue-B)
- [Buy Me a Coffee](https://www.buymeacoffee.com/blueb)
- [Ko-fi](https://ko-fi.com/blueb)
