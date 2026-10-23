# Compare 13-col vs 14-col:
for total_cols in [13, 14]:
    print(f"--- Total Cols: {total_cols} ---")
    # For a display window width of 340px:
    col_w = 340.0 / total_cols
    print(f"Col width: {col_w:.1f}px")
    
    # Type: 3 cols = 3 * col_w
    type_w = 3 * col_w
    # Cars: 2 cols = 2 * col_w
    cars_w = 2 * col_w
    
    # In 13 cols: center gap = 1 col; Time = 3 cols; Dest = 4 cols
    # In 14 cols: center gap = 2 cols; Time = 3 cols; Dest = 4 cols
    center_cols = total_cols - (3 + 2 + 3 + 4)
    center_gap = center_cols * col_w
    
    # Time width = 5 digits @ ~11px = ~55px
    # In 3 cols of col_w:
    time_col_w = 3 * col_w
    time_slack = time_col_w - 55
    
    # Total visual gap between '両' and Time:
    # If time is right-aligned in its 3 cols:
    visual_gap = center_gap + time_slack
    print(f"Center gap cols: {center_cols} ({center_gap:.1f}px)")
    print(f"Total visual gap between Cars and Time: {visual_gap:.1f}px ({visual_gap/col_w:.2f} chars)")
