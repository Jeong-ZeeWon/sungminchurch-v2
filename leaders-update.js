// 노션 원자료 기준: 한 주간 예배 담당자
// GitHub Actions가 매주 토요일 09:30(KST)에 자동 갱신합니다.

if (typeof churchData !== 'undefined') {
  churchData.leaders = {
  "title": "한 주간 예배 담당자",
  "subtitle": "이번 주 예배 담당자",
  "icon": "👥",
  "color": "ldr",
  "description": "이번 주 새벽·수요·금요·주일 예배 담당자",
  "week": "8/31 — 9/5",
  "dawn": {
    "days": [
      "월",
      "화",
      "수",
      "목",
      "금",
      "토"
    ],
    "preacher": [
      "최명환",
      "초하루",
      "최명환",
      "정지원",
      "정지원",
      "정지원"
    ],
    "caption": [
      "노태규",
      "",
      "노태규",
      "박정인",
      "박정인",
      "박정인"
    ],
    "accomp": [
      "김진희",
      "",
      "사모님",
      "김진희",
      "사모님",
      "최우진"
    ]
  },
  "wednesday": {
    "date": "9/2(수)",
    "preacher": "목사님",
    "worship": "정지원",
    "sound": "최명환",
    "pd": "최명환"
  },
  "friday": {
    "date": "9/4(금)",
    "worship": "윤수신",
    "pd": "박정인",
    "caption": "노태규",
    "prayer": [
      "민꿈",
      "교역자"
    ]
  },
  "sunday": {
    "date": "9/6(일)",
    "firstHost": "윤수신",
    "secondHost": "정지원",
    "thirdHost": "최명환",
    "firstPd": "최명환",
    "firstCaption": "노태규",
    "secondPd": "최명환"
  }
};
}
