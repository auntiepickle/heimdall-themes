<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::table("settings",function(Blueprint $t){
            $t->enum("theme_mode",["auto","manual"])->default("auto")->after("background_image");
            $t->string("theme_name",64)->nullable()->after("theme_mode");
        });
    }
    public function down(): void {
        Schema::table("settings",function(Blueprint $t){ $t->dropColumn(["theme_mode","theme_name"]); });
    }
};