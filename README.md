Moje maturitní práce je zaměřena na vytvoření uceleného softwarového a hardwarového ekosystému pro vlastní zpracování soutěže „Na lovu“. Nejedná se o jedinou aplikaci, ale o distribuovanou platformu, která v reálném čase řídí průběh hry, koordinuje zobrazení na deseti i více obrazovkách, zpracovává vstupy z tabletů a komunikuje s fyzickými herními prvky.

Architektura a logika systému Celý systém je postaven na centrálním serveru v Node.js. Komunikace probíhá obousměrně přes protokol WebSockets, což umožňuje okamžitou odezvu bez znatelného zpoždění. Server drží kompletní stav hry – od aktivní otázky a běhu časovačů až po aktuální skóre a pořadí odpovědí. Unikátnost řešení spočívá v systému scén: přepnutím scény (např. „žebřík“, „časovač“, „Finále“) server automaticky změní obsah a grafické rozhraní na všech připojených terminálech, což minimalizuje nároky na obsluhu.

Role zařízení a vizuální rozhraní Do systému je zapojena široká škála zařízení s různými rolemi:

Ovladače: Dva tablety pro asistenty režie s odlišnými ovládacími prvky a informacemi.

Prezentace: Hlavní projektor pro diváky, nakloněná obrazovka pro herní „žebřík“, a displeje za hráči zobrazující skóre a jména. Součástí jsou i samostatné tablety se jmény hráčů, ukazující kdo se přihlásil ve finále hry.

Aktivní účastníci: Moderátor, lovec i hráč mají vlastní tablety pro zobrazení otázek a volbu odpovědí.

Komunikace: Speciální tablet pro štáb umožňuje vizuální signalizaci (palce nahoru/dolů) a textové zprávy během show.

Všechna rozhraní jsou vytvořena pomocí moderních webových technologií (HTML, CSS, JavaScript) a obsahují pokročilé animace, 2D i 3D grafiku a automatizovaný hudební podkres synchronizovaný s děním na obrazovce.

Hardware a integrace dat Pro fyzickou interakci využívají hráči vlastní 3D tištěná tlačítka připojená k mikrokontroleru Arduino. Ten komunikuje se serverem a předává informaci o stisku, kterou server validuje (např. blokuje stisk mimo časový limit). Každý hráč má před sebou tablet, který se při platném stisku rozsvítí a ohlásí jeho jméno. Databáze otázek je pro snadnou správu uložena v Google Sheets. Server si data při startu stáhne do paměti, což umožňuje plynulý chod bez závislosti na rychlosti internetu během samotné hry a nabízí volbu obtížnosti pro různé věkové kategorie.

Síťová infrastruktura a uživatelský komfort Aby byl systém použitelný i pro lidi bez technického vzdělání, implementoval jsem „Zero Configuration“ síťové řešení. Využívám vlastní nakonfigurovaný router s lokální doménou. Díky statickým DNS záznamům a automatizovaným spouštěcím skriptům není nutné na tabletech konfigurovat IP adresy – stačí zadat adresu do prohlížeče. Navíc díky UDP Discovery protokolu si Arduino samo vyhledá server v síti bez jakéhokoli zásahu uživatele. Po připojení se zobrazí grafický rozcestník, kde si uživatel jednoduše zvolí svou roli (např. „Moderátor“) a zařízení se okamžitě plně integruje do hry.

Cílem práce bylo skloubit programování, embedded systémy a síťovou administraci do jednoho profesionálního celku, který je snadno přenositelný a připravený pro jednoduché spuštění.
