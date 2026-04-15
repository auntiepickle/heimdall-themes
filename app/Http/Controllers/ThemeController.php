<?php
namespace App\Http\Controllers;
use App\Models\Theme; use App\Setting; use Illuminate\Http\Request;

class ThemeController extends Controller {
    public function index() {
        $themes=Theme::all(); $s=Setting::firstOrNew([]);
        return view("settings.themes",["themes"=>$themes,"activeSlug"=>$s->theme_name??null,"activeMode"=>$s->theme_mode??"auto"]);
    }
    public function update(Request $request) {
        $v=$request->validate(["theme_name"=>["nullable","string","max:64"],"theme_mode"=>["required","in:auto,manual"]]);
        if($v["theme_name"]&&!Theme::find($v["theme_name"])) return back()->withErrors(["theme_name"=>"Not found."]);
        $s=Setting::firstOrNew([]); $s->theme_name=$v["theme_name"]; $s->theme_mode=$v["theme_mode"]; $s->save();
        return redirect()->route("settings.themes")->with("success","Saved.");
    }
    public function preview(string $slug) {
        $t=Theme::find($slug); if(!$t) abort(404);
        return response()->json(["slug"=>$t->slug,"name"=>$t->name,"cssUrl"=>$t->cssUrl(),"hasJs"=>$t->hasJs()]);
    }
}