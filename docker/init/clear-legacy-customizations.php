<?php
// Piped into: php artisan tinker < this-file.php
$keys = ['custom_js', 'custom_css'];
foreach ($keys as $k) {
    $s = App\Setting::where('key', $k)->first();
    if (!$s) { echo "[heimdall-themes] $k: not found\n"; continue; }
    $changed = false;
    if ($s->value) { $s->value = ''; $s->save(); $changed = true; }
    $cleared = DB::table('setting_user')->where('setting_id', $s->id)->where('uservalue', '!=', '')->update(['uservalue' => '']);
    if ($cleared > 0) $changed = true;
    echo "[heimdall-themes] $k: " . ($changed ? "cleared ($cleared user rows)" : "already empty") . "\n";
}
