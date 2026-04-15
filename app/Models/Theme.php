<?php
namespace App\Models;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Collection;

class Theme {
    public string $slug, $name, $description, $author;
    public ?string $preview;
    public array $variants, $autoSchedule;
    public string $path;

    public function __construct(array $d, string $path) {
        $this->slug=$d["slug"]; $this->name=$d["name"];
        $this->description=$d["description"]??""; $this->author=$d["author"]??"";
        $this->preview=$d["preview"]??null; $this->variants=$d["variants"]??["default"];
        $this->autoSchedule=$d["auto_schedule"]??[]; $this->path=$path;
    }

    public static function all(): Collection {
        $p=resource_path("themes");
        if(!File::isDirectory($p)) return collect();
        return collect(File::directories($p))->map(function($dir){
            $j=$dir."/theme.json";
            if(!File::exists($j)) return null;
            $d=json_decode(File::get($j),true);
            if(!$d||!isset($d["slug"])) return null;
            return new self($d,$dir);
        })->filter()->values();
    }

    public static function find(string $slug): ?self { return self::all()->firstWhere("slug",$slug); }
    public function cssUrl(): string { return asset("themes/{$this->slug}/theme.css"); }
    public function jsUrl(): string  { return asset("themes/{$this->slug}/theme.js"); }
    public function hasJs(): bool    { return File::exists($this->path."/theme.js"); }
    public function isMultiVariant(): bool { return count($this->variants)>1; }

    public function currentVariant(): string {
        if(!$this->isMultiVariant()) return $this->variants[0]??"default";
        $h=(int)now()->format("H");
        foreach($this->autoSchedule as $v=>$r){
            $f=(int)$r["from"];$t=(int)$r["to"];
            if($f<$t){if($h>=$f&&$h<$t)return $v;}
            else{if($h>=$f||$h<$t)return $v;}
        }
        return $this->variants[0];
    }
}