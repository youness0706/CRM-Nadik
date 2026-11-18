import React from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import PhoneInTalkOutlinedIcon from '@mui/icons-material/PhoneInTalkOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useLanguage } from '../state/LanguageContext';

const copy = {
  fr: {
    eyebrow: 'La gestion simple des associations sportives',
    title: 'Gagnez du temps. Faites grandir votre club.',
    subtitle: 'Nadik réunit vos adhérents, paiements, impayés et finances dans un seul espace, pensé pour les associations marocaines.',
    start: 'Commencer gratuitement',
    login: 'Se connecter',
    demo: 'Demander une démonstration',
    trust: 'Conçu pour les clubs et associations sportives au Maroc',
    featuresTitle: 'Tout ce qu’il faut pour piloter votre association',
    featuresSubtitle: 'Une équipe plus organisée, des paiements mieux suivis et une vision claire de votre activité.',
    members: 'Adhérents',
    membersText: 'Profils, catégories, documents et recherche rapide.',
    payments: 'Paiements et impayés',
    paymentsText: 'Suivez les cotisations, reçus et retards en quelques clics.',
    finance: 'Situation financière',
    financeText: 'Revenus, dépenses, événements et résultat net au même endroit.',
    events: 'Événements et personnel',
    eventsText: 'Organisez vos activités et gardez votre équipe alignée.',
    howTitle: 'Commencez en quelques minutes',
    step1: 'Créez votre espace',
    step2: 'Ajoutez vos adhérents',
    step3: 'Suivez votre activité',
    readyTitle: 'Prêt à mieux gérer votre club ?',
    readyText: 'Testez Nadik avec votre équipe et découvrez une gestion plus claire dès le premier jour.',
    contact: 'Parlons de votre association',
    footer: 'Nadik · Gestion des associations sportives',
    language: 'Langue',
  },
  ar: {
    eyebrow: 'تسيير سهل للجمعيات الرياضية',
    title: 'وفروا الوقت وطوّروا ناديكم.',
    subtitle: 'يجمع ناديك المنخرطين والأداءات والمتأخرات والمالية في مساحة واحدة، مصممة للجمعيات المغربية.',
    start: 'ابدأ مجاناً',
    login: 'تسجيل الدخول',
    demo: 'اطلب عرضاً توضيحياً',
    trust: 'مصمم للأندية والجمعيات الرياضية في المغرب',
    featuresTitle: 'كل ما تحتاجه لتسيير جمعيتك',
    featuresSubtitle: 'فريق أكثر تنظيماً، أداءات أوضح، ورؤية دقيقة لنشاطكم.',
    members: 'المنخرطون',
    membersText: 'الملفات والفئات والوثائق والبحث السريع.',
    payments: 'الأداءات والمتأخرات',
    paymentsText: 'تتبع الانخراطات والوصولات والمتأخرات بسهولة.',
    finance: 'الوضعية المالية',
    financeText: 'المداخيل والمصاريف والأنشطة والنتيجة الصافية في مكان واحد.',
    events: 'الأنشطة والموظفون',
    eventsText: 'نظموا أنشطتكم وحافظوا على تنسيق فريقكم.',
    howTitle: 'ابدأوا في دقائق',
    step1: 'أنشئوا فضاءكم',
    step2: 'أضيفوا المنخرطين',
    step3: 'تتبعوا نشاطكم',
    readyTitle: 'هل أنتم مستعدون لتسيير أفضل؟',
    readyText: 'جربوا ناديك مع فريقكم واكتشفوا تسييراً أوضح من اليوم الأول.',
    contact: 'لنتحدث عن جمعيتكم',
    footer: 'ناديك · تسيير الجمعيات الرياضية',
    language: 'اللغة',
  },
};

const features = [
  { icon: GroupsOutlinedIcon, key: 'members', color: '#006064' },
  { icon: AccountBalanceWalletOutlinedIcon, key: 'payments', color: '#ef6c00' },
  { icon: TrendingUpOutlinedIcon, key: 'finance', color: '#2e7d32' },
  { icon: EventAvailableOutlinedIcon, key: 'events', color: '#1565c0' },
];

export default function Landing() {
  const { language, setLanguage, direction } = useLanguage();
  const text = copy[language] || copy.fr;

  return (
    <Box dir={direction} sx={{ minHeight: '100vh', bgcolor: '#f7fafb', color: '#1c242c' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,0.94)', color: '#1c242c', borderBottom: '1px solid #e2e8f0' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, sm: 76 }, gap: 2 }}>
            <Typography component={RouterLink} to="/" variant="h5" fontWeight={800} sx={{ color: '#006064', textDecoration: 'none', letterSpacing: '-0.04em' }}>
              Nadik
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <FormControl size="small" sx={{ minWidth: 88 }}>
              <Select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                aria-label={text.language}
                startAdornment={<LanguageIcon sx={{ fontSize: 17, mr: 0.5, color: 'text.secondary' }} />}
                sx={{ borderRadius: 2, bgcolor: '#fff', '& .MuiSelect-select': { py: 0.7, px: 1, fontSize: '0.82rem' } }}
              >
                <MenuItem value="fr">Français</MenuItem>
                <MenuItem value="ar">العربية</MenuItem>
              </Select>
            </FormControl>
            <Button component={RouterLink} to="/login" variant="text" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
              {text.login}
            </Button>
            <Button component={RouterLink} to="/register" variant="contained" sx={{ bgcolor: '#006064', '&:hover': { bgcolor: '#00363a' } }}>
              {text.start}
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Box sx={{ background: 'linear-gradient(135deg, #e0f2f1 0%, #f7fafb 58%, #fff3e0 100%)', overflow: 'hidden' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
          <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip label={text.eyebrow} sx={{ mb: 2, bgcolor: '#ffffff', color: '#006064', fontWeight: 700 }} />
              <Typography variant="h1" sx={{ fontSize: { xs: '2.45rem', sm: '3.5rem', md: '4.35rem' }, lineHeight: 1.04, fontWeight: 800, letterSpacing: '-0.055em', color: '#00363a', mb: 2 }}>
                {text.title}
              </Typography>
              <Typography sx={{ maxWidth: 600, color: '#47616c', fontSize: { xs: '1rem', md: '1.18rem' }, lineHeight: 1.7, mb: 3 }}>
                {text.subtitle}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
                <Button component={RouterLink} to="/register" size="large" variant="contained" endIcon={<ArrowForwardIcon />} sx={{ bgcolor: '#006064', px: 2.5, '&:hover': { bgcolor: '#00363a' } }}>
                  {text.start}
                </Button>
                <Button component={RouterLink} to="/login" size="large" variant="outlined" sx={{ borderColor: '#006064', color: '#006064', px: 2.5 }}>
                  {text.login}
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 3, alignItems: 'center', color: '#5c6e81' }}>
                <SecurityOutlinedIcon sx={{ fontSize: 18, color: '#2e7d32' }} />
                <Typography variant="body2">{text.trust}</Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ maxWidth: 520, mx: 'auto', p: { xs: 1.5, sm: 2.5 }, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.72)', boxShadow: '0 18px 60px rgba(0,96,100,0.15)', border: '1px solid rgba(255,255,255,0.9)' }}>
                <Box sx={{ bgcolor: '#ffffff', borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <Box sx={{ px: 2.5, py: 2, bgcolor: '#006064', color: '#fff' }}>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>Nadik</Typography>
                    <Typography variant="h6" fontWeight={700}>{language === 'ar' ? 'لوحة التحكم' : 'Tableau de bord'}</Typography>
                  </Box>
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
                      {[
                        [language === 'ar' ? 'المنخرطون' : 'Adhérents', '128', '#e0f2f1'],
                        [language === 'ar' ? 'الأداءات' : 'Paiements', '93%', '#fff3e0'],
                        [language === 'ar' ? 'المداخيل' : 'Revenus', '4 250 DH', '#e8f5e9'],
                        [language === 'ar' ? 'المتأخرات' : 'Impayés', '12', '#e3f2fd'],
                      ].map(([label, value, bg]) => (
                        <Box key={label} sx={{ p: 1.5, bgcolor: bg, borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="h6" fontWeight={800}>{value}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ mt: 2, height: 110, borderRadius: 2, bgcolor: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                      {[25, 46, 37, 70, 56, 82, 64, 92].map((height, index) => (
                        <Box key={index} sx={{ position: 'absolute', bottom: 12, left: `${8 + index * 12}%`, width: 18, height: `${height}%`, bgcolor: index % 2 ? '#ffb74d' : '#00838f', borderRadius: '5px 5px 0 0', opacity: 0.85 }} />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Box sx={{ maxWidth: 680, mb: 4 }}>
          <Typography variant="h4" sx={{ color: '#00363a', mb: 1 }}>{text.featuresTitle}</Typography>
          <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>{text.featuresSubtitle}</Typography>
        </Box>
        <Grid container spacing={2}>
          {features.map(({ icon: Icon, key, color }) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={key}>
              <Card sx={{ height: '100%', bgcolor: '#fff' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ width: 46, height: 46, display: 'grid', placeItems: 'center', borderRadius: 2.5, bgcolor: `${color}15`, color, mb: 2 }}><Icon /></Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 0.8 }}>{text[key]}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{text[`${key}Text`]}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box sx={{ bgcolor: '#00363a', color: '#fff' }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
          <Typography variant="h4" sx={{ mb: 3 }}>{text.howTitle}</Typography>
          <Grid container spacing={2}>
            {[text.step1, text.step2, text.step3].map((step, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={step}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: '#ff6f00', fontWeight: 800 }}>{index + 1}</Box>
                  <Typography fontWeight={700}>{step}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 7, md: 9 }, textAlign: 'center' }}>
        <PhoneInTalkOutlinedIcon sx={{ color: '#ff6f00', fontSize: 42, mb: 1 }} />
        <Typography variant="h4" sx={{ color: '#00363a', mb: 1 }}>{text.readyTitle}</Typography>
        <Typography color="text.secondary" sx={{ lineHeight: 1.7, mb: 3 }}>{text.readyText}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
          <Button component={RouterLink} to="/register" size="large" variant="contained" sx={{ bgcolor: '#006064', '&:hover': { bgcolor: '#00363a' } }}>{text.start}</Button>
          <Button href="#contact" size="large" variant="outlined" sx={{ borderColor: '#006064', color: '#006064' }}>{text.contact}</Button>
        </Stack>
      </Container>

      <Box id="contact" component="footer" sx={{ borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
        <Container maxWidth="lg" sx={{ py: 3, display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">{text.footer}</Typography>
          <Typography variant="body2" color="text.secondary">{text.demo}</Typography>
        </Container>
      </Box>
    </Box>
  );
}
