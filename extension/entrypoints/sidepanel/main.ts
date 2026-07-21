const root = document.getElementById("root");

if (root) {
  root.innerHTML = `
    <div style="padding:20px;font:14px/1.45 system-ui,sans-serif;color:#535862;">
      <strong style="display:block;margin-bottom:8px;color:#181d27;">Local only</strong>
      <p style="margin:0 0 12px;">Zero for Outlook keeps settings and stats on this device. There is no cloud account to manage here.</p>
      <p style="margin:0;color:#717680;font-size:13px;">Open the extension settings from the toolbar icon to view your streak, badges, and preferences.</p>
    </div>
  `;
}
