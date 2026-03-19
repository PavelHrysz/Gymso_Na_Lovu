Set shell = CreateObject("Shell.Application")
' Získá cestu ke složce, kde leží tento skript
currentDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
' Spustí váš bat soubor jako správce (runas) z relativní cesty
shell.ShellExecute "cmd.exe", "/c cd /d """ & currentDir & """ && ""soubory_hry\start_hry.bat""", "", "runas", 1