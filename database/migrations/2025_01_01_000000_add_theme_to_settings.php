<?php
use Illuminate\Database\Migrations\Migration;
return new class extends Migration {
    // No-op. Theme selection is stored as a key-value row in the settings
    // table via Setting::where('key','theme_name'), not as a column.
    // This migration exists only to prevent artisan from complaining
    // about an unrun migration file.
    public function up(): void {}
    public function down(): void {}
};
