# pi-context-image-cap

이미지가 많은 pi 세션에서 context가 불필요하게 커지는 걸 막아주는 패키지입니다.

## 왜 만들었나

pi는 compaction을 할 때 텍스트는 요약하지만, 이미지(base64)는 그대로 남겨둡니다. 그래서 스크린샷이나 winshot을 자주 붙여넣는 세션은 시간이 지날수록 점점 무거워지고, 결국 compaction이 제대로 안 되거나 token을 많이 먹는 문제가 생깁니다.

이 패키지는 두 가지 방식으로 그 문제를 줄여줍니다.

## 들어있는 것

### 1. 자동으로 오래된 이미지 제거 (extension)

`extensions/context-image-cap.ts`

provider에 요청을 보낼 때마다, 오래된 이미지 블록을 텍스트 placeholder로 바꿔서 보내줍니다. 최근 몇 장만 남기고 나머지는 모델이 안 보게 하는 방식입니다.

디스크에 저장된 세션 내용은 그대로 두고, 실제로 모델에 전달되는 데이터만 줄입니다.

### 2. 이미 부푼 세션 파일 정리 (script)

`scripts/cap-session-images.mjs`

이미 디스크에 저장된 `.jsonl` 세션 파일에서 이미지 base64를 작은 placeholder로 교체해주는 도구입니다.

```bash
# 미리보기
node scripts/cap-session-images.mjs --dry session.jsonl

# 실제로 교체 (1x1 PNG)
node scripts/cap-session-images.mjs session.jsonl

# 64x64 크기로 교체 (조금 덜 파괴적)
node scripts/cap-session-images.mjs --mode downscale session.jsonl

# 최근 5장만 남기고 나머지 정리
node scripts/cap-session-images.mjs --keep 5 session.jsonl
```

항상 백업을 먼저 만들고, JSON 파싱 검증까지 한 뒤에 파일을 교체합니다.

## 설치

```bash
pi install git:yourname/pi-context-image-cap
```

또는 로컬에서:

```bash
pi install /path/to/pi-context-image-cap
```

## 주의할 점

- 이 도구는 이미지를 아예 없애거나 줄이는 방향이라, 오래된 스크린샷을 다시 보고 싶을 때는 불편할 수 있습니다.
- `--mode downscale`를 쓰면 1x1보다는 좀 더 나은 품질을 유지할 수 있습니다.
- 이미 많이 부푼 세션은 먼저 `--dry`로 확인해보고 진행하는 걸 추천합니다.

## License

MIT
