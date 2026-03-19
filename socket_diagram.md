# Socket Communication Diagram for "Na Lovu" Game

This diagram shows the flow of Socket.IO events between the server and various clients in the "Na Lovu" game system.

## Overview
- **Server**: Node.js with Socket.IO, central hub for all communications.
- **Clients**: Various HTML pages running in browsers (tablets, monitors, controllers).
- **Communication**: Real-time via WebSockets using Socket.IO.

## Mermaid Sequence Diagram

```mermaid
sequenceDiagram
    participant Server
    participant Controller
    participant Moderator
    participant Hrac (Player)
    participant Lovec (Hunter)
    participant Stoly (Tables 1-6)
    participant Zebrik (Ladder)
    participant Finale
    participant Otazky (Questions)
    participant Others (Castka, etc.)

    Note over Server, Others: Initialization
    Server->>Controller: sceneUpdate, numberInput, initQuestionIndex, updateTimer, scenarUpdate, profileUpdate, stolyDataUpdate
    Server->>Moderator: Same as above + otazkyNacteny, rychleOtazkyUpdate, finaleOtazkyUpdate, lovecOtazkyUpdate, scenarUvodUpdate
    Server->>Hrac: otazkyNacteny, dalsiOtazka, syncCorrectAnswer
    Server->>Lovec: Same as Hrac
    Server->>Stoly: stolyDataUpdate, profileUpdate, stisknutoHrac{id}
    Server->>Zebrik: updateZebrikState, ladderState, lowerAmount, numberInput, higherAmount, amountType, hracvyhrazebrik, lovecvyhrazebrik
    Server->>Others: Various updates (castka, timer, etc.)

    Note over Controller, Server: Controller Commands
    Controller->>Server: changeScene, dalsiOtazka, numberInput, vyhra, higherAmount, lowerAmount, amountType, zvyscastku, snizcastku, startTimer, pause, play, reset, odpovedhrac, odpovedlovec, ukazzpravnou, finaleCommand, zebrikCommand, stopAudio, nastavProfilOffline, nactiLokalniOtazky, resetujRychleOtazky, uvodniznelka, lovecprichazi, konec, dalsihrac, petvterin, vypln1, vypln2, vypln3, resetOtazek, prihlasitHrace, odstranRychlouOtazku, resetFinaleState, resetKameraCastka, hnise, lovecvyhra, timerStarted2m, minuta, zacatek, prohrals, updateCounter, resetCounter

    Note over Moderator, Server: Moderator Actions
    Moderator->>Server: syncVsechnoZGoogle, resetZebriku, posunIndexRychle, posunIndexFinale, resetujFinale, nactiLokalniOtazky, dejMiRychleOtazky, dejMiVsechnyOtazky, dejMiAktualniIndex, dejMiFinaleOtazky, dejMiLovecOtazky, posunIndexLovec, lovecvyhrazebrik, hracvyhrazebrik, dejMiScenar, dejMiFinaleOtazky, posliPalec, nactiLokalniOtazky

    Note over Hrac, Server: Player Answers
    Hrac->>Server: hrac (answer choice A/B/C)

    Note over Lovec, Server: Hunter Answers
    Lovec->>Server: lovec (answer choice A/B/C)

    Note over Stoly, Server: Table Interactions (via Arduino HTTP, but socket for updates)
    Stoly->>Server: (Primarily receives updates, Arduino sends via HTTP GET /arduino)

    Note over Zebrik, Server: Ladder Display
    Zebrik->>Server: resetZebriku

    Note over Finale, Server: Finale Screen
    Finale->>Server: (Receives updates)

    Note over Otazky, Server: Questions Display
    Otazky->>Server: dejMiVsechnyOtazky, dejMiAktualniIndex

    Note over Others, Server: Other Displays
    Others->>Server: Various requests like dejMiScenar, updateCounter, resetCounter

    Note over Server, All: Broadcast Events
    Server->>All: playSound, vyhra, playerReached, hracvyhrazebrik, hunterCaughtPlayer, lovecvyhrazebrik, prohrals, hunterReached, updateZebrikState, ladderState, otazkyNacteny, rychleOtazkyUpdate, finaleOtazkyUpdate, lovecOtazkyUpdate, scenarUvodUpdate, scenarUpdate, stolyDataUpdate, dalsiOtazka, syncCorrectAnswer, ukazzpravnou, odpovedhrac, odpovedlovec, zvyscastku, snizcastku, pause, startTimer, play, reset, vynulujCastku, hnise, lovecvyhra, timerStarted2m, minuta, zacatek, uvodniznelka, lovecprichazi, konec, dalsihrac, petvterin, vypln1, vypln2, vypln3, prohrals, counterUpdate, finaleCommand, syncHotovo, profileUpdate, dalsiOtazka, aktivovatHrac{id}, ukazPalecModeratorovi, posilamVsechnyOtazky, posilamAktualniIndex, rychleIndexUpdate, finaleIndexUpdate, lovecIndexUpdate, enableAnswers, disableAnswers

    Note over Server, All: Game State Management
    Note right of Server: Server maintains central state: questionGameState, finaleGameState, ladderState, currentAmount, etc.
    Note right of Server: Handles validation, scoring, win conditions, broadcasts updates
```

## Key Components

### Server (server.js)
- **Receives**: All client socket.emit events
- **Sends**: io.emit broadcasts to all connected clients
- **State Management**: Maintains game state (questions, ladder, amounts, timers)
- **External Data**: Fetches from Google Sheets, saves locally
- **Arduino Integration**: HTTP endpoint for buzzer presses

### Clients
- **Controller**: Main control interface, sends scene changes, timer controls, amount inputs, answer enable/disable
- **Moderator**: Manages questions, quick questions, finale questions
- **Hrac (Player)**: Sends answer choices (A/B/C), receives enable/disable signals
- **Lovec (Hunter)**: Sends answer choices (A/B/C), receives enable/disable signals
- **Stoly (Tables)**: Display table data, receive buzzer notifications
- **Zebrik (Ladder)**: Displays ladder state, sends reset
- **Finale**: Displays finale progress
- **Otazky (Questions)**: Displays current questions
- **Others**: Castka (amount), timers, backgrounds, etc.

### Event Flow Examples
1. **Question Round**:
   - Controller -> Server: changeScene(scene5)
   - Server -> All: sceneUpdate
   - Server -> Hrac/Lovec: dalsiOtazka
   - Hrac -> Server: hrac(A)
   - Server validates, updates state
   - Controller -> Server: odpovedhrac
   - Server -> All: odpovedhrac, ukazzpravnou (if correct)
   - Server moves ladder, broadcasts updateZebrikState

2. **Amount Input**:
   - Controller -> Server: numberInput(5000)
   - Server -> All: numberInput(5000)

3. **Answer Enable/Disable**:
   - Controller -> Server: petvterin
   - Server -> Hrac/Lovec: enableAnswers
   - (After 7 seconds) Server -> Hrac/Lovec: disableAnswers

4. **Question Synchronization**:
   - Moderator -> Server: dejMiVsechnyOtazky
   - Server -> Moderator: posilamVsechnyOtazky
   - Moderator -> Server: dejMiAktualniIndex
   - Server -> Moderator: posilamAktualniIndex
   - Controller -> Server: numberInput({number: 50000})
   - Server updates currentAmount, broadcasts numberInput

3. **Sync from Google**:
   - Moderator -> Server: syncVsechnoZGoogle
   - Server fetches data, saves locally, broadcasts updates to all clients

### Special Notes
- Arduino buzzers send HTTP GET to /arduino endpoint, not sockets
- Server uses UDP for Arduino discovery
- Clients connect via Socket.IO, server runs on port 80
- Data persisted in local files (castka, data/profil/*.json)