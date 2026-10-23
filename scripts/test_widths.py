# Test layout widths for various screen widths
for container_w in [320, 360, 390, 410]:
    # outer bezel px-3 (24px)
    window_w = container_w - 24
    # window inner padding px-2 (16px)
    inner_w = window_w - 16
    print(f"Container: {container_w}px -> Inner width: {inner_w}px")
    
    # At font size 20px:
    # "普　通" (2 chars + space) = 60px
    # gap = 8px
    # "６両" (2 chars) = 40px
    left_w = 60 + 8 + 40 # 108px
    
    # Time "18:11" (5 chars * 10px) = 50px
    time_w = 50
    
    # Dest: 2 chars "白　石" = 60px; 4 chars "仙台空港" = 80px
    dest_w_2 = 60
    dest_w_4 = 80
    
    # Gap between time and dest = 10px
    right_w_2 = time_w + 10 + dest_w_2 # 120px
    right_w_4 = time_w + 10 + dest_w_4 # 140px
    
    slack_2 = inner_w - (left_w + right_w_2)
    slack_4 = inner_w - (left_w + right_w_4)
    print(f"  2-char dest: left={left_w}px, right={right_w_2}px, center gap={slack_2}px ({slack_2/inner_w*100:.1f}%)")
    print(f"  4-char dest: left={left_w}px, right={right_w_4}px, center gap={slack_4}px ({slack_4/inner_w*100:.1f}%)")
