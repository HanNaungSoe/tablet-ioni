package com.example.app;

import android.os.Bundle;
import android.view.View;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private long lastBackPressMs = 0;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    hideSystemUI();
  }

  @Override
  public void onResume() {   // 🔥 MUST BE public
    super.onResume();
    hideSystemUI();
  }

  private void hideSystemUI() {
    getWindow().getDecorView().setSystemUiVisibility(
      View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        | View.SYSTEM_UI_FLAG_FULLSCREEN
        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
    );
  }

  @Override
  public void onBackPressed() {
    long now = System.currentTimeMillis();
    if (now - lastBackPressMs < 2000) {
      finish();
      return;
    }
    lastBackPressMs = now;
    Toast.makeText(this, "Swipe back again to exit", Toast.LENGTH_SHORT).show();
  }
}
