<?php
namespace App\Http\Controllers;
use App\Models\Theme; use App\Setting; use Illuminate\Http\Request;

class ThemeController extends Controller {
    public function index() {
        $themes = Theme::all()->filter(fn($t) => $t->slug !== '_template');
        $activeSlug = Setting::fetch('theme_name') ?: null;
        return view("settings.themes", [
            "themes" => $themes,
            "activeSlug" => $activeSlug,
        ]);
    }

    public function update(Request $request) {
        $v = $request->validate([
            "theme_name" => ["nullable","string","max:64"],
        ]);
        $slug = $v["theme_name"] ?: '';
        if ($slug && !Theme::find($slug)) {
            return back()->withErrors(["theme_name" => "Theme not found."]);
        }

        Setting::updateOrCreate(
            ['key' => 'theme_name'],
            ['value' => $slug, 'type' => 'text', 'label' => 'Theme', 'system' => 1, 'group_id' => 0, 'order' => 0]
        );

        if ($slug) {
            return redirect()->route("dash")->with("success", "Theme applied.");
        }
        return redirect()->route("dash")->with("success", "Theme removed.");
    }

    public function preview(string $slug) {
        $t = Theme::find($slug);
        if (!$t) abort(404);
        return response()->json(["slug" => $t->slug, "name" => $t->name, "cssUrl" => $t->cssUrl(), "hasJs" => $t->hasJs()]);
    }
}
