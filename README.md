# THWS Scheduler

Ein Service, der es Nutzern ermöglicht, auf Basis von Semester- und Vorlesungsinformationen der offiziellen [THWS Vorlesungs- und Belegungspläne](https://business.thws.de/studierende/vorlesungs-und-belegungsplaene/) spezifische Module aus verschiedenen Vorlesungsplänen zu extrahieren und zu aggregieren. Diese aggregierten Informationen sind dann als JSON, CSV (UTF-8) und ICS downloadbar.

## Funktionen

- **Extrahieren und Aggregieren** von Modulen aus verschiedenen Vorlesungsplänen
- **Export** der Daten in JSON, CSV und ICS-Format
- **Kalenderansicht** mit Upload-Funktion für CSV-Dateien
- **Dark & Light Mode** für optimale Benutzerfreundlichkeit
- **Authentifizierung** über Bearer Token

## Website

Das Frontend ist verfügbar unter: [https://marc-wilhelm.github.io/winf-thws-scheduler/](https://marc-wilhelm.github.io/winf-thws-scheduler/)

## Hinweis

Der Service funktioniert nur, wenn die dahinterliegende Azure Functions-App aktiv und die GitHub Page live ist.

## API-Dokumentation

Das Frontend kommuniziert mit dem Backend über verschiedene API-Endpunkte.

### 1. Auth API

**Endpunkt:** [https://thws-scheduler.azurewebsites.net/api/auth](https://thws-scheduler.azurewebsites.net/api/auth)

**POST Request:**
```json
{
  "username": "username",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "username:token",
  "username": "username"
}
```

### 2. Course Scraper API

**Endpunkt:** [https://thws-scheduler.azurewebsites.net/api/course_scraper](https://thws-scheduler.azurewebsites.net/api/course_scraper)

**GET Request (nur Header):**
```json
{
  "Authorization": "Bearer token"
}
```

**Response (Beispiel-Auszug):**
```json
{
  "abgerufen": "2025-04-30 10:03:26",
  "semester_info": {
    "aktuelles_semester": "SS 2025",
    "zeitraum": "28.04.2025 - 10.07.2025"
  },
  "studiengaenge": [
    {
      "name": "BBA",
      "vollername": "Bachelor Business Analytics",
      "semester": [
        {
          "name": "2. Semester",
          "zahl": 2,
          "ist_wiederholung": false,
          "urls": [
            {
              "url": "https://business.thws.de/fileadmin/share/vlplan/BBA%202%20SS%2025.html",
              "gruppe": null,
              "text": "Vorlesungsplan"
            }
          ],
          "module": [
            {
              "abk": "GSTAT",
              "name": "Grundlagen der Statistik [BBA]"
            },
            {
              "abk": "INFO",
              "name": "Grundlagen der Informatik & des Programmierens [BBA]"
            }
            // Weitere Module
          ]
        }
        // Weitere Semester
      ]
    }
    // Weitere Studiengänge
  ]
}
```

### 3. Schedule Scraper API

**Endpunkt:** [https://thws-scheduler.azurewebsites.net/api/schedule_scraper](https://thws-scheduler.azurewebsites.net/api/schedule_scraper)

**GET Request:**
```json
{
  "plans": [
    {
      "url": "https://business.thws.de/fileadmin/share/vlplan/BBA%206%20SS%2025.html",
      "label": "BBA 6",
      "filter": ["PBA1", "SPBA"]
    },
    {
      "url": "https://business.thws.de/fileadmin/share/vlplan/BBW%206%20SS%2025.html",
      "label": "BBW 6",
      "filter": ["SP WINF"]
    }
  ]
}
```

**Response (Beispiel-Auszug):**
```json
{
  "abgerufen": "2025-04-30 10:09:58",
  "tage": [
    {
      "wochentag": "Mo",
      "datum": "2025-04-28",
      "vorlesungen": [
        {
          "id": "zf782068",
          "start": "2025-04-28 8:15:00",
          "ende": "2025-04-28 16:45:00",
          "fach": "SPBA",
          "titel": "Vertiefung Business Analytics [BBA]",
          "typ": "seminaristischer Unterricht",
          "dozent": "Klenk",
          "raum": "WÜ - Frie 17a: F.1.03",
          "quelle": "BBA 6"
        }
      ]
    },
    {
      "wochentag": "Mi",
      "datum": "2025-04-30",
      "vorlesungen": [
        {
          "id": "zf778589",
          "start": "2025-04-30 8:15:00",
          "ende": "2025-04-30 16:45:00",
          "fach": "SP WINF",
          "titel": "Schwerpunkt Wirtschaftsinformatik und Digital Business [BBW]",
          "typ": "Schwerpunkt",
          "dozent": "Butscher",
          "raum": "WÜ - Mü 12: M.0.03",
          "quelle": "BBW 6"
        }
      ]
    }
    // Weitere Tage
  ]
}
```
