@extends("layouts.app")
@section("content")
<div style="max-width:700px;margin:0 auto;padding:2rem 1rem;">
    <h2 style="font-weight:800;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.5);margin-bottom:1.5rem;font-size:1.8rem;">Themes</h2>
    @if(session("success"))
        <div style="background:#dcfce7;color:#166534;border-radius:12px;padding:.75rem 1rem;margin-bottom:1rem;">{{ session("success") }}</div>
    @endif
    @if($errors->any())
        <div style="background:#fee2e2;color:#991b1b;border-radius:12px;padding:.75rem 1rem;margin-bottom:1rem;">{{ $errors->first() }}</div>
    @endif
    <form method="POST" action="{{ route('settings.themes.update') }}">
        @csrf
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-bottom:2rem;">
            <label style="cursor:pointer;">
                <input type="radio" name="theme_name" value="" {{ !$activeSlug?'checked':'' }} style="display:none;" class="tr">
                <div class="tc {{ !$activeSlug?'ta':'' }}" style="border-radius:16px;overflow:hidden;border:2px solid transparent;background:rgba(255,255,255,.7);box-shadow:0 4px 16px rgba(0,0,0,.1);transition:all .2s;">
                    <div style="height:100px;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);display:flex;align-items:center;justify-content:center;font-size:1.8rem;">&#127968;</div>
                    <div style="padding:.75rem 1rem;">
                        <div style="font-weight:800;color:#1e293b;">Default</div>
                        <div style="font-size:.78rem;color:#64748b;">Stock Heimdall, no effects</div>
                    </div>
                </div>
            </label>
            @foreach($themes as $theme)
            <label style="cursor:pointer;">
                <input type="radio" name="theme_name" value="{{ $theme->slug }}" {{ $activeSlug===$theme->slug?'checked':'' }} style="display:none;" class="tr">
                <div class="tc {{ $activeSlug===$theme->slug?'ta':'' }}" style="border-radius:16px;overflow:hidden;border:2px solid transparent;background:rgba(255,255,255,.7);box-shadow:0 4px 16px rgba(0,0,0,.1);transition:all .2s;">
                    <div style="height:100px;background:linear-gradient(135deg,#1e2a45,#0a0a14);display:flex;align-items:center;justify-content:center;font-size:1.8rem;">&#127769;</div>
                    <div style="padding:.75rem 1rem;">
                        <div style="font-weight:800;color:#1e293b;">{{ $theme->name }}</div>
                        <div style="font-size:.78rem;color:#64748b;">{{ $theme->description }}</div>
                    </div>
                </div>
            </label>
            @endforeach
        </div>
        <button type="submit" style="background:#6366f1;color:#fff;border:none;border-radius:12px;padding:.75rem 2rem;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 4px 16px rgba(99,102,241,.3);transition:all .2s;">Apply Theme</button>
    </form>
</div>
<style>.ta{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,.25)!important;}.tc:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.15);}</style>
<script>document.querySelectorAll(".tr").forEach(r=>r.addEventListener("change",()=>{document.querySelectorAll(".tc").forEach(c=>c.classList.remove("ta"));r.nextElementSibling.classList.add("ta");}));</script>
@endsection
