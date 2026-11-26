<?php
header('Content-Type: application/json');
{
  $prefix = 'data:image/jpeg;base64,';
  $raw = isset($_POST['Photo']) ? $_POST['Photo'] : '';
  $status = isset($_POST['Status']) ? $_POST['Status'] : 'failed';

  if ($status !== 'success' || strpos($raw, $prefix) !== 0) {
    echo json_encode(array('status' => 'failed', 'error' => 'Invalid payload'));
    exit;
  }

  $encoded = substr($raw, strlen($prefix));
  $image = base64_decode($encoded, true);

  if ($image === false || strlen($image) < 100 || strlen($image) > 3000000) {
    echo json_encode(array('status' => 'failed', 'error' => 'Invalid image data'));
    exit;
  }

  if (substr($image, 0, 2) !== "\xFF\xD8") {
    echo json_encode(array('status' => 'failed', 'error' => 'Not a JPEG image'));
    exit;
  }

  $dir = '../../db/photos';
  if (!is_dir($dir)) {
    mkdir($dir, 0775, true);
  }

  $fname = date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.jpg';
  $written = file_put_contents($dir . '/' . $fname, $image);

  if ($written === false) {
    echo json_encode(array('status' => 'failed', 'error' => 'Unable to save image'));
    exit;
  }

  $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
  $data = array(
    'status' => 'success',
    'file' => $fname,
    'size' => $written,
    'ip' => $ip
  );

  $tmp = '../../logs/photo.txt.tmp';
  file_put_contents($tmp, json_encode($data));
  rename($tmp, '../../logs/photo.txt');
  echo json_encode(array('status' => 'success', 'file' => $fname));
}
