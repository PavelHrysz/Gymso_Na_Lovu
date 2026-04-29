---
config:
  look: neo
  theme: redux-color
---
sequenceDiagram
    autonumber

    box rgb(240, 240, 240) Řízení a Štáb
    participant Controller
    participant Moderator
    participant Stab as Štáb
    end

    box rgb(255, 230, 200) Centrální uzel
    participant Server
    end

    box rgb(220, 255, 220) Aktivní účastníci
    participant Hrac as Hráč
    participant Lovec as Lovec
    participant Stoly as Stoly (Arduino)
    end

    box rgb(230, 230, 255) Zobrazovače
    participant Zebrik as Žebřík
    participant Finale as Finále
    participant Zobrazovace as Ostatní UI
    end

    %% 1. PŘIPOJENÍ
    rect rgb(230, 240, 230)
    Note over Controller, Zobrazovace: 1. INICIALIZACE PŘI PŘIPOJENÍ KLIENTA (io.on connection)
    Server-->>Controller: sceneUpdate, numberInput, initQuestionIndex,<br/>updateTimer, scenarUpdate, profileUpdate,<br/>stolyDataUpdate, vyhra, rychleOtazkyUpdate,<br/>counterUpdate
    end

    %% 2. SYNCHRONIZACE DAT
    rect rgb(200, 220, 240)
    Note over Controller, Zobrazovace: 2. NAČÍTÁNÍ A SYNCHRONIZACE DAT
    par Stahování dat
        Moderator->>Server: syncVsechnoZGoogle / nactiLokalniOtazky<br/>nastavProfilOffline
        Server-->>Zobrazovace: Hromadný broadcast:<br/>otazkyNacteny, rychleOtazkyUpdate, finaleOtazkyUpdate,<br/>lovecOtazkyUpdate, scenarUvodUpdate, scenarUpdate,<br/>stolyDataUpdate, syncHotovo, profileUpdate, dalsiOtazka
    and Vyžádání dat
        Controller->>Server: Žádosti:<br/>dejMiScenar, dejMiFinaleOtazky, dejMiRychleOtazky,<br/>dejMiLovecOtazky, dejMiVsechnyOtazky, dejMiAktualniIndex
        Server-->>Controller: Specifické odpovědi:<br/>scenarUpdate, posilamVsechnyOtazky,<br/>posilamAktualniIndex, syncCorrectAnswer...
    and Indexy
        Moderator->>Server: Posuny a resety:<br/>posunIndexRychle, posunIndexFinale, posunIndexLovec,<br/>resetujRychleOtazky, resetujFinale, odstranRychlouOtazku
        Server-->>Zobrazovace: Broadcast updatu indexů<br/>(*IndexUpdate)
    end
    end

    %% 3. ŘÍZENÍ HRY (OTÁZKY)
    rect rgb(255, 240, 200)
    Note over Controller, Zobrazovace: 3. ŘÍZENÍ HRY A OTÁZKY (1. a 2. kolo)
    Controller->>Server: changeScene(preset)
    Server-->>Zobrazovace: sceneUpdate, otazkyNacteny, dalsiOtazka,<br/>finaleOtazkyUpdate, lovecOtazkyUpdate
    
    Controller->>Server: dalsiOtazka / resetOtazek
    Server-->>Zobrazovace: dalsiOtazka, syncCorrectAnswer
    
    Controller->>Server: petvterin
    Server-->>Hrac: petvterin, enableAnswers (na 7 vteřin)
    Server-->>Lovec: petvterin, enableAnswers (na 7 vteřin)
    Note over Server: Po 7 vteřinách Server automaticky<br/>pošle 'disableAnswers'
    end

    %% 4. ODPOVĚDI
    rect rgb(255, 220, 220)
    Note over Hrac, Server: 4. ODPOVĚDI A VYHODNOCENÍ
    par Odeslání odpovědí
        Hrac->>Server: hrac (A/B/C)
        Lovec->>Server: lovec (A/B/C)
        Stoly-->>Server: HTTP GET /arduino?prikaz=tlacitko
        Server-->>Zobrazovace: stisknutoHrac{id}
    end
    Server->>Server: Validace odpovědí<br/>a uložení stavu
    
    Controller->>Server: odpovedhrac / odpovedlovec / ukazzpravnou
    Server-->>Zobrazovace: Odkrytí UI:<br/>odpovedhrac, odpovedlovec, ukazzpravnou
    end

    %% 5. ŽEBŘÍK A PENÍZE
    rect rgb(220, 200, 240)
    Note over Controller, Zobrazovace: 5. ŽEBŘÍK A ČÁSTKY
    par Částky
        Controller->>Server: Úpravy částek:<br/>numberInput, vyhra, higherAmount, lowerAmount,<br/>zvyscastku, snizcastku, amountType,<br/>resetKameraCastka, vynulujCastku, reloadCastka
        Server-->>Zobrazovace: Broadcast updatu UI<br/>(numberInput, vyhra, higherAmount...)
    and Žebřík
        Controller->>Server: resetZebriku / zebrikCommand / hnise
        Server-->>Zebrik: updateZebrikState, ladderState
    and Výhry a prohry
        Server-->>Zobrazovace: Vyhodnocení posunu:<br/>hracvyhrazebrik, lovecvyhrazebrik, playSound(playerWin),<br/>playerReached, hunterCaughtPlayer, prohrals, hunterReached
    end
    end

    %% 6. FINÁLE
    rect rgb(200, 240, 240)
    Note over Controller, Finale: 6. FINÁLOVÁ ŠTVANICE
    Controller->>Server: finaleCommand (addBox, removeBox,<br/>changeColor, changeColorBack) / resetFinaleState
    Server-->>Finale: finaleCommand (přeposlání pro UI)<br/>addbox / changecolor
    Note over Server: Při dostižení hráče odesílá<br/>událost 'prohrals'
    end

    %% 7. ZVUKY, ČAS, ŠTÁB
    rect rgb(240, 230, 200)
    Note over Controller, Zobrazovace: 7. MÉDIA, ČASOVAČE A ŠTÁB
    par Časovače
        Controller->>Server: startTimer / play / pause / reset
        Server-->>Zobrazovace: Broadcast stejných událostí
    and Zvuky a Animace
        Controller->>Server: Média:<br/>stopAudio, lovecvyhra, timerStarted2m, minuta,<br/>zacatek, uvodniznelka, lovecprichazi, konec,<br/>dalsihrac, vypln1, vypln2, vypln3
        Server-->>Zobrazovace: Přeposlání médií všem
    and Štáb a Moderátor
        Stab->>Server: updateCounter / resetCounter
        Server-->>Zobrazovace: counterUpdate
        Stab->>Server: posliPalec
        Server-->>Moderator: ukazPalecModeratorovi
        Controller->>Server: prihlasitHrace
        Server-->>Zobrazovace: aktivovatHrac{id}
    end
    end