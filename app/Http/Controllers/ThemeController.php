<?php
namespace App\Http\Controllers;
use App\Models\Theme; use App\Setting; use Illuminate\Http\Request;

class ThemeController extends Controller {
    public function index() {
        $themes = Theme::all()->filter(fn($t) => !str_starts_with(basename($t->path), '_'));
        $raw = Setting::fetch('theme_name');
        $activeSlug = ($raw && $raw !== false) ? $raw : null;
        return view("settings.themes", [
            "themes" => $themes,
            "activeSlug" => $activeSlug,
        ]);
    }

    public function update(Request $request) {
        $slug = trim($request->input('theme_name', ''));
        if ($slug && $slug !== '__random__' && !Theme::find($slug)) {
            return back()->withErrors(["theme_name" => "Theme not found."]);
        }

        $setting = Setting::where('key', 'theme_name')->first();
        if (!$setting) {
            $setting = new Setting();
            $setting->key = 'theme_name';
            $setting->type = 'text';
            $setting->label = 'Theme';
            $setting->system = 1;
            $setting->group_id = 0;
            $setting->order = 0;
        }
        $setting->value = $slug;
        $setting->save();

        return redirect()->route("dash")->with("success", $slug === '__random__' ? "Random mode." : ($slug ? "Theme applied." : "Theme removed."));
    }

    public function preview(string $slug) {
        $t = Theme::find($slug);
        if (!$t) abort(404);
        return response()->json(["slug" => $t->slug, "name" => $t->name, "cssUrl" => $t->cssUrl(), "hasJs" => $t->hasJs()]);
    }

    public static function getThemeName(): ?string {
        $val = Setting::fetch('theme_name');
        if (!$val || $val === false) return null;
        if ($val === '__random__') {
            $themes = Theme::all()->filter(fn($t) => !str_starts_with(basename($t->path), '_'));
            if ($themes->isEmpty()) return null;
            return $themes->random()->slug;
        }
        return $val;
    }
}
