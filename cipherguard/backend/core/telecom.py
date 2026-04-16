def compute_telecom_score(
    inbound_calls_15min: int,
    screen_share_active: bool,
    clipboard_external: bool,
    iccid_changed: bool,
    ported_recently: bool
) -> dict:
    # Call score
    if inbound_calls_15min >= 6:
        call_score = 80
    elif inbound_calls_15min >= 3:
        call_score = 40
    else:
        call_score = inbound_calls_15min * 8
    screen_share_score = 100 if screen_share_active else 0
    clipboard_score = 60 if clipboard_external else 0
    iccid_score = 80 if iccid_changed else 0
    porting_score = 70 if ported_recently else 0
    total = min(200, call_score + screen_share_score + clipboard_score + iccid_score + porting_score)
    fast_path_trigger = total >= 160
    return {
        'call_score': call_score,
        'screen_share_score': screen_share_score,
        'clipboard_score': clipboard_score,
        'iccid_score': iccid_score,
        'porting_score': porting_score,
        'total': total,
        'fast_path_trigger': fast_path_trigger
    }
