/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VirtualFile, ZipArchive } from './types.ts';

export const SAMPLE_PROJECT_V1_FILES: VirtualFile[] = [
  {
    id: 'sample_v1_f1',
    path: 'firmware/quantum_magneto.c',
    name: 'quantum_magneto.c',
    extension: 'c',
    size: 2150,
    content: `/**
 * Quantum-Enhanced Optically Pumped Magnetometer (OPM) Firmware v1.0
 * Target: STM32F4 / ARM Cortex-M4
 * License: Proprietary & Confidential
 */

#include <stdio.h>
#include <stdint.h>
#include <math.h>

#define LASER_PUMP_WAVELENGTH_NM 795.0f // Rubidium D1 Line
#define SAMPLING_RATE_HZ 1000
#define BUFFER_SIZE 256

static volatile float raw_adc_buffer[BUFFER_SIZE];
static uint16_t buffer_head = 0;

// Flaw 1: Integer overflow risk and lack of mutex in ISR
void ADC_IRQHandler(float sample) {
    raw_adc_buffer[buffer_head++] = sample;
    // Missing modulo wrap-around protection: buffer_head will overflow memory boundary!
}

// Flaw 2: Zero-division vulnerability in Larmor frequency estimation
float calculate_magnetic_field_nT(float larmor_freq_hz) {
    const float gyromagnetic_ratio_gamma = 6.99583f; // Hz/nT for Rb-87
    // Inconsistent physical unit check: directly dividing without thermal noise floor subtraction
    return larmor_freq_hz / gyromagnetic_ratio_gamma;
}

int main(void) {
    printf("Starting Quantum Magnetometer v1.0\\n");
    return 0;
}
`,
    originalContent: '',
    isBinary: false,
    mimeType: 'text/x-c',
    archiveId: 'arch_sample_v1',
    archiveName: 'Quantum_Magnetometer_v1.0.zip',
    versionTag: 'v1.0-Pilot',
    lastModified: Date.now() - 86400000 * 5,
  },
  {
    id: 'sample_v1_f2',
    path: 'algorithms/kalman_filter.py',
    name: 'kalman_filter.py',
    extension: 'py',
    size: 1420,
    content: `"""
Adaptive Extended Kalman Filter (EKF) for Ambient Magnetic Noise Cancellation
Version 1.0 (Initial Draft)
"""
import numpy as np

class MagneticNoiseFilter:
    def __init__(self, process_noise_q=1e-4, measurement_noise_r=1e-2):
        self.q = process_noise_q
        self.r = measurement_noise_r
        self.state_estimate = 0.0
        self.error_covariance = 1.0

    def update(self, measured_field_nt):
        # Time update (Predict)
        p_pred = self.error_covariance + self.q
        
        # Flaw: Missing numerical stability safeguards against negative covariance
        kalman_gain = p_pred / (p_pred + self.r)
        
        # Measurement update
        self.state_estimate = self.state_estimate + kalman_gain * (measured_field_nt - self.state_estimate)
        self.error_covariance = (1.0 - kalman_gain) * p_pred
        
        return self.state_estimate

if __name__ == '__main__':
    filter = MagneticNoiseFilter()
    sample_data = [45000.1, 45002.3, 44998.7, 45001.0]
    for s in sample_data:
        print("Filtered Field (nT):", filter.update(s))
`,
    originalContent: '',
    isBinary: false,
    mimeType: 'text/x-python',
    archiveId: 'arch_sample_v1',
    archiveName: 'Quantum_Magnetometer_v1.0.zip',
    versionTag: 'v1.0-Pilot',
    lastModified: Date.now() - 86400000 * 5,
  },
  {
    id: 'sample_v1_f3',
    path: 'patent/claims_draft.md',
    name: 'claims_draft.md',
    extension: 'md',
    size: 1840,
    content: `# پیش‌نویس ادعاهای اختراع (Patent Claims Draft - v1.0)

## عنوان اختراع
حسگر مغناطیسی کوانتومی با پمپاژ نوری دوگانه و فیلترینگ وفقی نویز محیطی

### ادعای مستقل ۱ (Independent Claim 1):
سیستمی برای اندازه‌گیری میدان‌های مغناطیسی فوق‌ضعیف، شامل:
یک سلول بخار روبیدیوم-۸۷؛
یک لیزر دیود قابل تنظیم با طول موج خط D1 روبیدیوم؛
یک مدار پردازش سیگنال دیجیتال که با نرخ ۱۰۰۰ نمونه در ثانیه میدان مغناطیسی را محاسبه می‌کند.

*نقص داوری*: ادعای فوق بسیار کلی بوده و در برابر هنر قبلی (Prior Art) پتنت‌های NIST و QuSpin آسیب‌پذیر است زیرا وجه تمایز ابداعی مشخص نشده است.

### ادعای وابسته ۲:
سیستم ادعای ۱، که در آن فیلتر کالمان برای کاهش تداخل ۵۰ هرتز برق شهر استفاده شده است.
`,
    originalContent: '',
    isBinary: false,
    mimeType: 'text/markdown',
    archiveId: 'arch_sample_v1',
    archiveName: 'Quantum_Magnetometer_v1.0.zip',
    versionTag: 'v1.0-Pilot',
    lastModified: Date.now() - 86400000 * 5,
  },
];

export const SAMPLE_PROJECT_V2_FILES: VirtualFile[] = [
  {
    id: 'sample_v2_f1',
    path: 'firmware/quantum_magneto.c',
    name: 'quantum_magneto.c',
    extension: 'c',
    size: 2600,
    content: `/**
 * Quantum-Enhanced Optically Pumped Magnetometer (OPM) Firmware v2.1
 * Includes Ring Buffer and Lock-in Quadrature Demodulation
 */

#include <stdio.h>
#include <stdint.h>
#include <math.h>

#define BUFFER_SIZE 512
#define GYRO_RATIO_RB87 6.99583f // Hz/nT

static volatile float raw_adc_buffer[BUFFER_SIZE];
static volatile uint16_t buffer_head = 0;

void ADC_IRQHandler(float sample) {
    raw_adc_buffer[buffer_head] = sample;
    buffer_head = (buffer_head + 1) % BUFFER_SIZE; // Fixed buffer wrap-around
}

// Quadrature lock-in detection for sub-picotesla sensitivity
float demodulate_quadrature(const float* buffer, uint16_t length, float ref_freq_hz) {
    float in_phase = 0.0f;
    float quadrature = 0.0f;
    float dt = 1.0f / 10000.0f;
    
    for (uint16_t i = 0; i < length; i++) {
        float angle = 2.0f * 3.14159265f * ref_freq_hz * (i * dt);
        in_phase += buffer[i] * cosf(angle);
        quadrature += buffer[i] * sinf(angle);
    }
    return sqrtf(in_phase * in_phase + quadrature * quadrature) / (length / 2.0f);
}
`,
    originalContent: '',
    isBinary: false,
    mimeType: 'text/x-c',
    archiveId: 'arch_sample_v2',
    archiveName: 'Quantum_Magnetometer_v2.1_Optimized.zip',
    versionTag: 'v2.1-Optimized',
    lastModified: Date.now() - 86400000 * 2,
  },
  {
    id: 'sample_v2_f2',
    path: 'patent/claims_draft.md',
    name: 'claims_draft.md',
    extension: 'md',
    size: 2400,
    content: `# پیش‌نویس ادعاهای اختراع بین‌المللی (PCT Patent Draft - v2.1)

## اختراع: آشکارساز مغناطیسی اتمی با مدولاسیون فاز فرکوآنسی تفاضلی

### ادعای مستقل ۱ (PCT Claim 1):
یک دستگاه مغناطیس‌سنج اتمی با حساسیت زیر پیکوتسلا (sub-pT/√Hz)، شامل:
الف) محفظه گاز محتوی ایزوتوپ خالص Rb-87 در فشار بافر گاز نئون ۵۰ تور؛
ب) منبع لیزری تک‌مد با قفل طول موج فعال بر اساس طیف‌سنجی جذب اشباع؛
ج) آرایه دمودولاسیون مربعی دوکاناله سنکرون؛
د) واحد محاسباتی EKF بلادرنگ با بروزرسانی ماتریس کواریانس در فرکانس ۵ کیلوهرتز.
`,
    originalContent: '',
    isBinary: false,
    mimeType: 'text/markdown',
    archiveId: 'arch_sample_v2',
    archiveName: 'Quantum_Magnetometer_v2.1_Optimized.zip',
    versionTag: 'v2.1-Optimized',
    lastModified: Date.now() - 86400000 * 2,
  },
];

export const SAMPLE_ARCHIVES: ZipArchive[] = [
  {
    id: 'arch_sample_v1',
    name: 'Quantum_Magnetometer_v1.0.zip',
    size: 5410,
    extractedAt: Date.now() - 86400000 * 5,
    fileCount: 3,
    versionLabel: 'v1.0-Pilot',
  },
  {
    id: 'arch_sample_v2',
    name: 'Quantum_Magnetometer_v2.1_Optimized.zip',
    size: 5000,
    extractedAt: Date.now() - 86400000 * 2,
    fileCount: 2,
    versionLabel: 'v2.1-Optimized',
  },
];

import { JuryEvaluation } from './types.ts';

export const SAMPLE_JURY_EVALUATION: JuryEvaluation = {
  id: 'eval_sample_quantum',
  timestamp: Date.now(),
  overallScore: 87,
  verdict: 'MINOR_REVISIONS',
  verdictTitleFa: 'تایید اصالت نوآورانه با نیاز به اصلاحات نرم‌افزاری و کالیبراسیون تجربی',
  verdictSummaryFa: 'هیئت داوران بین‌المللی طرح و دو نسخه ارائه شده حسگر مغناطیسی کوانتومی (OPM) را بررسی نمود. مبانی فیزیکی خط جذب D1 روبیدیوم-۸۷ و بهره‌گیری از فیلتر وفقی کالمان دارای استحکام علمی و پتانسیل تجاری چشمگیر است. نسخه ۲.۱ با دمودولاسیون مربعی، بهبود حساسیت SNR را تا ۷ برابر نشان می‌دهد اما دو باگ بحرانی سرریز بافر و عدم مهار نوسان حرارتی در کد شناسایی شد که هوش مصنوعی اصلاحیه‌های مستقیم آن‌ها را تدوین کرده است.',
  physicsAndMathValidation: {
    score: 92,
    lawsChecked: [
      'قانون اول و دوم ترمودینامیک و مهار اثر اتلاف حرارتی لیزر',
      'فرکانس لارمور در گذار زیمن اتمی',
      'تطابق ابعادی ضرایب کوپلینگ ژیرومغناطیسی (6.99583 Hz/nT)'
    ],
    theoreticalConsistency: 'سیستم از منظر کوانتومی و الکترودینامیک کلاسیک کاملاً منسجم بوده و نقض قوانین پایه‌ای گزارش نشد.',
    flawsIdentified: [
      'عدم محاسبه دقیق نویز شتری (Shot noise limit) در فرکانس‌های کاری بالای ۱ کیلوهرتز',
      'خطای تقریب نوسان زاویه‌ای در فرمول دمودولاسیون مربعی'
    ]
  },
  patentViability: {
    score: 89,
    noveltyStatus: 'سطح گام ابتکاری بالا (High Inventive Step) نسبت به پتنت‌های QuSpin',
    priorArtRisks: [
      'پتنت US9453888B2 شرکت NIST در زمینه میکرو-سل‌های حرارتی',
      'اظهارنامه PCT/US2021/04512 در زمینه دمودولاسیون فاز'
    ],
    claimStrength: 'ادعای مستقل در نسخه ۲.۱ بسیار قوی‌تر است و عناصر تمایز آشکارساز تفاضلی را احصا کرده است.',
    patentReadiness: 'آماده ثبت به عنوان اظهارنامه بین‌المللی PCT با اصلاح محدوده ادعاهای مستقل',
    recommendedPatentClaims: [
      'ادعای مستقل ۱: دستگاه اندازه‌گیری کوانتومی میدان مغناطیسی شامل محفظه بخار Rb-87 با بافر نئون ۵۰ تور و حلقه فاز قفل‌شده تفاضلی.',
      'ادعای وابسته ۲: دستگاه ادعای ۱ مجهز به الگوریتم مهار نویز وفقی بلادرنگ با بروزرسانی ماتریس کواریانس در فرکانس ۵ کیلوهرتز.',
      'ادعای وابسته ۳: ساختار ادعای ۱ که در آن حلقه بافر حلقوی مانع از بروز وقفه ناهمزمان ADC می‌شود.'
    ]
  },
  codeAndEngineeringRigor: {
    score: 82,
    algorithmicComplexity: 'دمودولاسیون مربعی O(N) و فیلتر کالمان O(1) در هر بروزرسانی',
    memoryAndConcurrencySafety: 'وجود ریسک جدی Race Condition در تابع وقفه ADC_IRQHandler در نسخه ۱.۰ که در نسخه ۲.۱ مهار شده است',
    architecturalSoundness: 'ماژولار و سازگار با سیستم‌های Embedded سیستم‌های Real-time'
  },
  weaknessesAndFlaws: [
    {
      id: 'w1',
      title: 'سرریز بافر حلقوی و خطر Corruption حافظه در ADC_IRQHandler',
      severity: 'critical',
      description: 'در فایل firmware/quantum_magneto.c متغیر شمارنده بافر بدون محدودیت افزوده می‌شد که منجر به نشت و خطای حافظه در میکروکنترلر می‌گردد.',
      fixMethod: 'استفاده از اپراتور ماژولو و اعمال ساختار بافر حلقوی ایمن سنکرون',
      solvableByAI: true,
      targetFile: 'firmware/quantum_magneto.c'
    },
    {
      id: 'w2',
      title: 'آسیب‌پذیری ادعای ۱ پتنت در برابر پایگاه هنر قبلی NIST',
      severity: 'high',
      description: 'ادعای نسخه ۱.۰ فاقد مشخصات متمایز کننده گاز بافر و فرکانس مدولاسیون است و در مرحله بررسی شکلی رد خواهد شد.',
      fixMethod: 'جایگزینی با ادعای پیشنهادی ۴ بندی تفکیک شده استاندارد PCT',
      solvableByAI: true,
      targetFile: 'patent/claims_draft.md'
    },
    {
      id: 'w3',
      title: 'پایداری عددی کواریانس خطای فیلتر کالمان در شرایط نویز ضربه‌ای',
      severity: 'medium',
      description: 'در فایل kalman_filter.py در مواجهه با خطاهای ناگهانی ممکن است ماتریس کواریانس منفی شود.',
      fixMethod: 'اضافه کردن فرم جوزف (Joseph form) برای تضمین مثبت-معین بودن ماتریس کواریانس',
      solvableByAI: true,
      targetFile: 'algorithms/kalman_filter.py'
    },
    {
      id: 'w4',
      title: 'تست پایداری مکانیکی سلول بخار در شرایط شوک و لرزش فیزیکی',
      severity: 'high',
      description: 'آسیب‌پذیری اتصال نوری سلول بخار در برابر ارتعاشات هارمونیک بالای ۵۰۰ هرتز.',
      fixMethod: 'انجام تست فیزیکی طبق استاندارد MIL-STD-810G در آزمایشگاه مکانیک و استفاده از سیلیکون اپوکسی نوری',
      solvableByAI: false,
    },
    {
      id: 'w5',
      title: 'کالیبراسیون تجربی گرادیان مغناطیسی در اتاقک شیلد مغناطیسی (Zero-Gauss)',
      severity: 'medium',
      description: 'تعیین حد نهایی حساسیت سنسور به صورت فیزیکی در محفظه ۳ لایه مو-متال.',
      fixMethod: 'اندازه‌گیری نویز زمینه در اتاقک شیلد آزمایشگاهی و ثبت منحنی هیسترزیس',
      solvableByAI: false,
    }
  ],
  proposedEdits: [
    {
      id: 'pe_sample_1',
      filePath: 'firmware/quantum_magneto.c',
      rationale: 'اصلاح بافر حلقوی، جلوگیری از سرریز حافظه، افزودن تابع دمودولاسیون مربعی و بررسی ایمنی محاسبات فیزیکی',
      newFullContent: `/**
 * Quantum-Enhanced Optically Pumped Magnetometer (OPM) Firmware v2.5 (Patched)
 * Verified by Axiom International Scientific Jury
 * Target: STM32F4 / ARM Cortex-M4
 */

#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <math.h>

#define LASER_PUMP_WAVELENGTH_NM 795.0f // Rubidium D1 Line
#define SAMPLING_RATE_HZ 10000
#define BUFFER_SIZE 512
#define GYROMAGNETIC_RATIO_RB87 6.99583f // Hz/nT

static volatile float raw_adc_buffer[BUFFER_SIZE];
static volatile uint16_t buffer_head = 0;
static volatile uint16_t buffer_tail = 0;

// Patched: Thread-safe circular ring buffer with modulo indexing
void ADC_IRQHandler(float sample) {
    uint16_t next_head = (buffer_head + 1) % BUFFER_SIZE;
    if (next_head != buffer_tail) {
        raw_adc_buffer[buffer_head] = sample;
        buffer_head = next_head;
    }
}

// Patched: Lock-in quadrature demodulation for sub-picotesla SNR
float demodulate_quadrature(const float* buffer, uint16_t length, float ref_freq_hz) {
    if (length == 0 || ref_freq_hz <= 0.0f) return 0.0f;
    
    float in_phase = 0.0f;
    float quadrature = 0.0f;
    const float dt = 1.0f / (float)SAMPLING_RATE_HZ;
    const float two_pi = 6.283185307f;
    
    for (uint16_t i = 0; i < length; i++) {
        float angle = two_pi * ref_freq_hz * (float)i * dt;
        in_phase += buffer[i] * cosf(angle);
        quadrature += buffer[i] * sinf(angle);
    }
    
    float magnitude = sqrtf(in_phase * in_phase + quadrature * quadrature);
    return (2.0f * magnitude) / (float)length;
}

// Patched: Safeguarded Larmor frequency to magnetic field conversion
float calculate_magnetic_field_nT(float larmor_freq_hz) {
    if (larmor_freq_hz <= 0.0f) return 0.0f;
    return larmor_freq_hz / GYROMAGNETIC_RATIO_RB87;
}

int main(void) {
    printf("Axiom Patched Quantum Magnetometer Firmware Active\\n");
    return 0;
}
`
    },
    {
      id: 'pe_sample_2',
      filePath: 'patent/claims_draft.md',
      rationale: 'بازنویسی ادعاهای اختراع مطابق استانداردهای فرمی USPTO و معاهده همکاری ثبت اختراع PCT با رفع آسیب‌پذیری Prior Art',
      newFullContent: `# پیش‌نویس ادعاهای اختراع بین‌المللی مصوب هیئت داوران (PCT Patent Claims - v2.5)

## عنوان اختراع:
حسگر مغناطیسی اتمی با دمودولاسیون تفاضلی فاز و فیلترینگ فعال نویز کوانتومی

### ادعای مستقل ۱ (Independent Claim 1):
یک دستگاه مغناطیس‌سنج کوانتومی اتمی جهت سنجش میدان‌های مغناطیسی در محدوده پیکوتسلا، شامل:
۱. یک سلول بخار حاوی ایزوتوپ روبیدیوم-۸۷ و یک گاز خنثی بافر در فشار اسمی ۵۰ تور؛
۲. منبع نور همدوس پمپاژ نوری تنظیم‌شده بر طول موج ۷۹۵ نانومتر با پهنای خط کمتر از ۵۰۰ کیلوهرتز؛
۳. آشکارساز نوری تفاضلی جفت‌شده با یک حلقه دمودولاسیون مربعی همزمان؛
۴. یک پردازشگر سیگنال بلادرنگ که در آن یک بافر حلقوی محافظت‌شده داده‌های میدان را با فرکانس حداقل ۵ کیلوهرتز نمونه‌برداری و پالایش می‌کند.

### ادعای وابسته ۲:
دستگاه بر طبق ادعای ۱، که در آن فیلتر وفقی مبتنی بر فرم جوزف برای تضمین پایداری ماتریس کواریانس خطای تخمین میدان استفاده می‌شود.

### ادعای وابسته ۳:
دستگاه بر طبق ادعای ۱، که در آن دمودولاسیون مربعی بر مبنای ضرب سینوسی و کسینوسی با گام زمانی معکوس نرخ نمونه‌برداری فرکانس لارمور را استخراج می‌نماید.
`
    }
  ],
  multiVersionComparison: {
    versionsAnalyzed: ['Quantum_Magnetometer_v1.0.zip', 'Quantum_Magnetometer_v2.1_Optimized.zip'],
    bestVersionId: 'Quantum_Magnetometer_v2.1_Optimized.zip',
    bestVersionRationale: 'نسخه ۲.۱ از نظر الگوریتمی و تئوریک بلوغ بسیار بالاتری دارد (دمودولاسیون مربعی و ادعاهای دقیق‌تر پتنت). با اعمال پچ بافر حلقوی و فرم پایدار کالمان، این نسخه بهترین پایلوت تجاری‌سازی است.',
    rankings: [
      {
        versionId: 'Quantum_Magnetometer_v2.1_Optimized.zip',
        versionName: 'نسخه ۲.۱ (Optimized)',
        rank: 1,
        score: 89,
        pros: ['دمودولاسیون مربعی قفل‌شده', 'ادعاهای PCT منسجم', 'بهبود نسبت سیگنال به نویز تا ۷ برابر'],
        cons: ['مصرف توان بالاتر واحد پردازش'],
        keyDifferences: 'اضافه شدن دمودولاسیون سنکرون و ساختار دقیق ادعاهای ۴ بندی'
      },
      {
        versionId: 'Quantum_Magnetometer_v1.0.zip',
        versionName: 'نسخه ۱.۰ (Pilot)',
        rank: 2,
        score: 72,
        pros: ['سادگی کد و سربار محاسباتی اندک'],
        cons: ['آسیب‌پذیری ادعای پتنت در برابر Prior Art', 'خطر سرریز بافر در وقفه میکرو'],
        keyDifferences: 'نسخه اولیه آزمایشگاهی بدون مهار نویز محیطی'
      }
    ],
    hybridSynthesisRecipe: `فرمول سنتز برتر:
۱. استفاده از معماری کد فریم‌ور v2.1 به عنوان هسته اصلی
۲. اعمال فیلتر کالمان بهینه‌شده به همراه ادعاهای بازنویسی شده PCT
۳. حذف کدهای منسوخ v1.0 و ادغام بافر حلقوی اصلاح شده در فایل نهایی`
  }
};

