!macro customInstall
  ; ── Register .md file association ──
  WriteRegStr HKCR ".md" "" "MarkDawn.md"
  WriteRegStr HKCR ".md" "Content Type" "text/markdown"
  WriteRegStr HKCR "MarkDawn.md" "" "Markdown File"
  WriteRegStr HKCR "MarkDawn.md\DefaultIcon" "" "$INSTDIR\mark-dawn.exe,0"
  WriteRegStr HKCR "MarkDawn.md\shell" "" "open"
  WriteRegStr HKCR "MarkDawn.md\shell\open" "" "Open with mark-dawn"
  WriteRegStr HKCR "MarkDawn.md\shell\open\command" "" '"$INSTDIR\mark-dawn.exe" "%1"'

  ; ── Register .markdown file association ──
  WriteRegStr HKCR ".markdown" "" "MarkDawn.markdown"
  WriteRegStr HKCR ".markdown" "Content Type" "text/markdown"
  WriteRegStr HKCR "MarkDawn.markdown" "" "Markdown File"
  WriteRegStr HKCR "MarkDawn.markdown\DefaultIcon" "" "$INSTDIR\mark-dawn.exe,0"
  WriteRegStr HKCR "MarkDawn.markdown\shell" "" "open"
  WriteRegStr HKCR "MarkDawn.markdown\shell\open" "" "Open with mark-dawn"
  WriteRegStr HKCR "MarkDawn.markdown\shell\open\command" "" '"$INSTDIR\mark-dawn.exe" "%1"'

  ; ── Register in OpenWithProgids so mark-dawn appears in "Open with" ──
  WriteRegStr HKCR ".md\OpenWithProgids" "MarkDawn.md" ""
  WriteRegStr HKCR ".markdown\OpenWithProgids" "MarkDawn.markdown" ""

  ; ── Register app capabilities for Windows Default Programs ──
  WriteRegStr HKLM "Software\mark-dawn\Capabilities" "ApplicationDescription" "A fast, minimal Markdown editor"
  WriteRegStr HKLM "Software\mark-dawn\Capabilities" "ApplicationName" "mark-dawn"
  WriteRegStr HKLM "Software\mark-dawn\Capabilities\FileAssociations" ".md" "MarkDawn.md"
  WriteRegStr HKLM "Software\mark-dawn\Capabilities\FileAssociations" ".markdown" "MarkDawn.markdown"
  WriteRegStr HKLM "Software\RegisteredApplications" "mark-dawn" "Software\mark-dawn\Capabilities"

  ; ── Delete any cached UserChoice so Windows picks up the new default ──
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.md\UserChoice"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.markdown\UserChoice"

  ; ── Notify the shell to refresh icons and associations ──
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x0000, p 0, p 0)'
!macroend

!macro customUnInstall
  ; ── Remove .md association if it's ours ──
  ReadRegStr $0 HKCR ".md" ""
  ${If} $0 == "MarkDawn.md"
    DeleteRegValue HKCR ".md" ""
  ${EndIf}
  DeleteRegKey HKCR "MarkDawn.md"
  DeleteRegValue HKCR ".md\OpenWithProgids" "MarkDawn.md"

  ; ── Remove .markdown association if it's ours ──
  ReadRegStr $0 HKCR ".markdown" ""
  ${If} $0 == "MarkDawn.markdown"
    DeleteRegValue HKCR ".markdown" ""
  ${EndIf}
  DeleteRegKey HKCR "MarkDawn.markdown"
  DeleteRegValue HKCR ".markdown\OpenWithProgids" "MarkDawn.markdown"

  ; ── Remove app capabilities ──
  DeleteRegKey HKLM "Software\mark-dawn"
  DeleteRegValue HKLM "Software\RegisteredApplications" "mark-dawn"

  ; ── Notify the shell to refresh ──
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x0000, p 0, p 0)'
!macroend
