# Verified commit signing

Esportiz requires the pull request head commit to be verified before Vercel
builds a Preview. Local commits should therefore use a dedicated signing key.

## Configure SSH signing on Windows

1. Generate a dedicated Ed25519 key and protect it with a strong passphrase:

   ```powershell
   ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\esportiz_signing" -C "Esportiz commit signing"
   ```

2. In GitHub, open **Settings > SSH and GPG keys > New SSH key**, select
   **Signing Key**, and add the contents of
   `$env:USERPROFILE\.ssh\esportiz_signing.pub`.

3. Load the private key in the Windows SSH agent, then configure Git:

   ```powershell
   ssh-add "$env:USERPROFILE\.ssh\esportiz_signing"
   git config --global gpg.format ssh
   git config --global user.signingkey "$env:USERPROFILE/.ssh/esportiz_signing.pub"
   git config --global commit.gpgsign true
   ```

4. Create a signed test commit on a temporary branch and confirm that GitHub
   displays **Verified** before enabling a signed-commit branch rule.

Never commit, upload, or share the private key. Keep the recovery process and
passphrase outside the repository. If the key is lost or exposed, remove it
from GitHub immediately and generate a replacement.
