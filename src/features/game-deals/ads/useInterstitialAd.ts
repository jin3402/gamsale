import { useEffect, useState } from 'react'
import { createInterstitialController } from './interstitialController'

/**
 * 스토어로 이동하기 전에 보여줄 전면형 광고.
 * 마운트되면 백그라운드에서 미리 로드해 두고, `show(onFinished)`로 띄워요.
 * 광고 상태는 React 상태로 두지 않아서 광고가 로드·종료될 때 목록이 다시 그려지지 않아요.
 */
export function useInterstitialAd() {
  const [controller] = useState(createInterstitialController)

  useEffect(() => {
    controller.start()
    return controller.dispose
  }, [controller])

  return { show: controller.show }
}
