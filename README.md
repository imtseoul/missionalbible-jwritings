# atexts.missionalbible.org

미셔널 바이블의 공개 배포 파일입니다.

[미셔널 바이블](https://www.missionalbible.org/)

## 배포 용량 관리

`Compact Pages data` Actions는 main에 올라온 JSON·JSONL의 데이터 밖 공백을 제거합니다. 모든 고정판, 본문, 인용 주소와 파일 경로를 보존하며, 문자열 안의 공백·원어 표기·숫자·이스케이프는 바꾸지 않습니다. JSONL의 행 경계도 유지합니다.

변경 전후의 JSON 데이터를 대조한 뒤 문헌 목록의 파일 SHA-256과 `deployment-manifest.json`을 갱신합니다. 변경이 있으면 압축된 표현을 main에 커밋하고 Pages 빌드를 요청합니다. 동시 수정이 있으면 강제로 덮어쓰지 않고 중단합니다.

수동 실행: Actions → Compact Pages data → Run workflow. 크기와 검증 결과는 실행 요약에 표시됩니다. 원래 파일 바이트는 변경 전 Git 커밋에 남아 있습니다.

이 처리는 공백을 줄이는 무손실 최적화입니다. 모든 고정판을 계속 보관하므로 GitHub Pages의 공식 1GB 한도 충족을 보장하지는 않습니다. 고정판을 삭제하거나 기존 자료 주소를 바꾸는 작업은 포함하지 않습니다.
