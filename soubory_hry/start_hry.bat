@echo off
setlocal enabledelayedexpansion

:: Kontrola prav spravce
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ======================================================
    echo CHYBA: Musis spustit jako SPRAVCE!
    echo ======================================================
    pause
    exit /b
)

:: FIX PRO CESTU
cd /d "%~dp0"

:: --- KONFIGURACE ---
set SERVER_IP=192.168.0.100
set GATEWAY=192.168.0.1
set SSID_NAME="Na Lovu"

echo [ 0. DETEKCE PRIPOJENI ]
set ADAPTER_NAME=
:: Hledáme aktivní Ethernet (kabel)
for /f "tokens=3,4*" %%i in ('netsh interface show interface ^| findstr "Connect"') do (
    echo %%k | findstr /i "Ethernet" >nul
    if !errorLevel! equ 0 (
        set ADAPTER_NAME="%%k"
    )
)

if defined ADAPTER_NAME (
    echo [+] Nalezen aktivni KABEL: %ADAPTER_NAME%
    set IS_WIFI=0
) else (
    set ADAPTER_NAME="Wi-Fi"
    echo [!] Kabel nenalezen, prepinam na WI-FI.
    set IS_WIFI=1
)
echo -------------------------------------------------------

:: [ 1. KONTROLA SOUBORU ]
if not exist "server.js" (
    echo [!] CHYBA: Soubor server.js nebyl ve slozce nalezen!
    pause
    exit /b
)

echo [ 2. SYSTEM SETUP ]
echo -------------------------------------------------------
:: Nastaveni agresivni stability
echo A. Nastavuji IP %SERVER_IP% na adapteru %ADAPTER_NAME%...
netsh interface ip set address %ADAPTER_NAME% static %SERVER_IP% 255.255.255.0 %GATEWAY%
netsh interface ip set dns %ADAPTER_NAME% static %GATEWAY% validate=no
netsh interface ip set interface %ADAPTER_NAME% metric=1
ipconfig /flushdns >nul

:: Pokud jsme na Wi-Fi, zakazeme Windows skenovat okoli (vypne odpojovani)
if %IS_WIFI% equ 1 (
    echo B. Zamykam Wi-Fi kartu na aktualni siti...
    netsh wlan set autoconfig enabled=no interface=%ADAPTER_NAME% >nul 2>&1
)

echo.
echo [ 3. SERVER CONSOLE ]
echo =======================================================
echo Spoustim HLIDACE a Node.js server...
echo (Ne zavirej toto okno, hlida stabilitu site)
echo.

:: Spusteni serveru v novem okne, aby watchdog mohl bezet tady
start "SHOW-SERVER-NODE" node server.js

:: --- WATCHDOG SMYČKA ---
:WATCHDOG
:: Kontrola, jestli je adapter stale v rezimu Connected/Připojeno
netsh interface show interface name=%ADAPTER_NAME% | findstr /C:"Connect" >nul
if %errorLevel% neq 0 (
    echo [! ! !] VAROVANI: PRIPOJENI ZTRACENO v !time!
    if %IS_WIFI% equ 1 (
        echo Zkousim RECONNECT na %SSID_NAME%...
        netsh wlan set autoconfig enabled=yes interface=%ADAPTER_NAME% >nul
        netsh wlan connect name=%SSID_NAME% interface=%ADAPTER_NAME% >nul
        timeout /t 2 >nul
        netsh wlan set autoconfig enabled=no interface=%ADAPTER_NAME% >nul
    ) else (
        echo Zkontroluj kabel! Cekam na obnoveni...
    )
)

:: Pokud byl rucne vypnut Node server okno, skript muze skoncit
tasklist /FI "WINDOWTITLE eq SHOW-SERVER-NODE" | findstr "node.exe" >nul
if %errorLevel% neq 0 (
    echo [!] Node server byl ukoncen, precházím k úklidu.
    goto CLEANUP
)

timeout /t 1 /nobreak >nul
goto WATCHDOG


:CLEANUP
echo.
echo [ 4. CLEANUP ]
echo Vracim DHCP a systemove nastaveni...
if %IS_WIFI% equ 1 (
    netsh wlan set autoconfig enabled=yes interface=%ADAPTER_NAME% >nul 2>&1
)
netsh interface ip set address name=%ADAPTER_NAME% source=dhcp
netsh interface ip set dns name=%ADAPTER_NAME% source=dhcp

echo Vse hotovo.
timeout /t 5
exit